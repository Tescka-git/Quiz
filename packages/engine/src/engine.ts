/** Règles expérimentales d'une question isolée. Aucun effet d'environnement. */
namespace KuikuizEngine {
  export interface Question {
    id: string;
    options: string[];
    correctOption: string;
    durationMs: number;
    maxPoints: number;
    scoring: 'fixed' | 'speed';
  }
  export interface Answer {
    playerId: string;
    submissionId: string;
    option: string;
    elapsedMs: number;
    points: number;
  }
  export interface State {
    question: Question;
    players: string[];
    phase: 'open' | 'paused' | 'closed';
    elapsedMs: number;
    lastNowMs: number;
    answers: Answer[];
  }
  export type Command = { type: 'pause' } | { type: 'resume' } | { type: 'close' } | { type: 'checkpoint' }
    | { type: 'answer'; playerId: string; submissionId: string; option: string };
  export interface Result { state: State; status: string; answer?: Answer }

  function finite(value: number): boolean { return Number.isFinite(value) && value >= 0; }
  export function create(question: Question, players: string[], nowMs: number): State {
    if (!question.id || !finite(nowMs) || !finite(question.durationMs) || question.durationMs === 0
      || !finite(question.maxPoints) || !['fixed', 'speed'].includes(question.scoring)
      || question.options.length < 2 || question.options.some((id) => !id)
      || question.options.some((id, i) => question.options.indexOf(id) !== i)
      || !question.options.includes(question.correctOption)
      || players.length === 0 || players.some((id) => !id)
      || players.some((id, i) => players.indexOf(id) !== i)) throw new Error('Invalid configuration');
    return { question: { ...question, options: question.options.slice() }, players: players.slice(),
      phase: 'open', elapsedMs: 0, lastNowMs: nowMs, answers: [] };
  }
  /** Restaure le dernier point durable sans compter l'arrêt ni réutiliser l'ancienne horloge. */
  export function recover(input: State, nowMs: number): State {
    if (!finite(nowMs)) throw new Error('Invalid recovery time');
    return { ...input, question: { ...input.question, options: input.question.options.slice() },
      players: input.players.slice(), answers: input.answers.map((answer) => ({ ...answer })),
      phase: input.phase === 'closed' ? 'closed' : 'paused', lastNowMs: nowMs };
  }
  export function apply(input: State, command: Command, nowMs: number): Result {
    if (!finite(nowMs) || nowMs < input.lastNowMs) throw new Error('Invalid monotonic time');
    const elapsedMs = input.elapsedMs + (input.phase === 'open' ? nowMs - input.lastNowMs : 0);
    const state: State = { ...input, elapsedMs, lastNowMs: nowMs, answers: input.answers.slice() };
    if (command.type === 'checkpoint') return { state, status: 'checkpoint' };
    // Une retransmission identique retrouve son résultat même après clôture.
    if (command.type === 'answer') {
      const previous = state.answers.find((a) => a.submissionId === command.submissionId);
      if (previous) return previous.playerId === command.playerId && previous.option === command.option
        ? { state, status: 'duplicate', answer: { ...previous } } : { state, status: 'submission-conflict' };
    }
    if (command.type === 'close') { state.phase = 'closed'; return { state, status: 'closed' }; }
    if (command.type === 'pause') {
      if (state.phase !== 'open') return { state, status: 'invalid-phase' };
      state.phase = 'paused'; return { state, status: 'paused' };
    }
    if (command.type === 'resume') {
      if (state.phase !== 'paused') return { state, status: 'invalid-phase' };
      state.phase = 'open'; return { state, status: 'resumed' };
    }
    if (state.phase !== 'open') return { state, status: state.phase };
    // Convention expérimentale : l'échéance exacte appartient à la période expirée.
    if (elapsedMs >= state.question.durationMs) return { state, status: 'late' };
    if (!state.players.includes(command.playerId)) return { state, status: 'unknown-player' };
    if (!command.submissionId || !state.question.options.includes(command.option)) return { state, status: 'invalid-answer' };
    if (state.answers.some((a) => a.playerId === command.playerId)) return { state, status: 'already-answered' };
    const correct = command.option === state.question.correctOption;
    const points = correct ? state.question.maxPoints * (state.question.scoring === 'speed'
      ? 1 - 0.7 * elapsedMs / state.question.durationMs : 1) : 0;
    const answer: Answer = { playerId: command.playerId, submissionId: command.submissionId,
      option: command.option, elapsedMs, points };
    state.answers.push(answer);
    return { state, status: 'accepted-in-memory', answer: { ...answer } };
  }
  export function ranking(state: State): { playerId: string; points: number; rank: number }[] {
    return cumulativeRanking([state]);
  }
  export function cumulativeRanking(states: State[]): { playerId: string; points: number; rank: number }[] {
    if (!states.length) return [];
    const entries = states[0].players.map((playerId) => ({ playerId,
      points: states.reduce((total, state) => total + (state.answers.find(a => a.playerId === playerId)?.points || 0), 0), rank: 0 }));
    entries.sort((a, b) => b.points - a.points || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
    entries.forEach((entry, index) => { entry.rank = index > 0 && entry.points === entries[index - 1].points
      ? entries[index - 1].rank : index + 1; });
    return entries;
  }

  /** Trois questions isolées : les règles restent identiques sur tous les hôtes. */
  export interface QuizState { questions: Question[]; current: State; completed: State[] }
  export type QuizCommand = Command | { type: 'next' };
  export interface QuizResult { state: QuizState; status: string; answer?: Answer; questionId: string }
  export function createQuiz(questions: Question[], players: string[], nowMs: number): QuizState {
    if (!questions.length || questions.some((q, i) => questions.findIndex(other => other.id === q.id) !== i))
      throw new Error('Invalid quiz');
    const validated = questions.map(q => create(q, players, nowMs).question);
    return { questions: validated, current: create(validated[0], players, nowMs), completed: [] };
  }
  export function recoverQuiz(state: QuizState, nowMs: number): QuizState {
    return { ...state, current: recover(state.current, nowMs) };
  }
  export function applyQuiz(input: QuizState, command: QuizCommand, nowMs: number, questionId: string): QuizResult {
    if (questionId !== input.current.question.id)
      return { state: input, status: 'stale-question', questionId };
    if (command.type === 'next') {
      if (!finite(nowMs) || nowMs < input.current.lastNowMs) throw new Error('Invalid monotonic time');
      if (input.current.phase !== 'closed' || input.completed.length + 1 >= input.questions.length)
        return { state: input, status: 'invalid-phase', questionId };
      const completed = input.completed.concat([input.current]);
      return { state: { ...input, completed, current: create(input.questions[completed.length], input.current.players, nowMs) },
        status: 'next', questionId };
    }
    const result = apply(input.current, command, nowMs);
    // L'échéance est décidée par l'hôte, jamais par l'horloge du navigateur.
    if ((input.current.phase === 'open' || result.state.phase === 'open')
      && result.state.elapsedMs >= result.state.question.durationMs) result.state.phase = 'closed';
    // La liste initiale reste identique entre questions et malgré les déconnexions.
    // L'adaptateur persiste cette clôture avec la dernière réponse avant confirmation.
    if (result.status === 'accepted-in-memory'
      && result.state.players.every(id => result.state.answers.some(answer => answer.playerId === id)))
      result.state.phase = 'closed';
    return { ...result, state: { ...input, current: result.state }, questionId };
  }
  export function quizRanking(state: QuizState): { playerId: string; points: number; rank: number }[] {
    return cumulativeRanking(state.completed.concat([state.current]));
  }
}
