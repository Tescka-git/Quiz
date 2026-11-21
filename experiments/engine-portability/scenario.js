// Harnais commun Node.js / Android : assertions et collecte, aucune règle métier.
function runKuikuizScenario(fixture) {
    var state = KuikuizEngine.create(fixture.question, fixture.players, fixture.startNowMs);
    var trace = [];
    fixture.steps.forEach(function (step, index) {
        if (step.restoreBefore) state = JSON.parse(JSON.stringify(state));
        var result = KuikuizEngine.apply(state, step.command, step.nowMs);
        if (result.status !== step.expectedStatus || result.state.elapsedMs !== step.expectedElapsedMs)
            throw new Error('Unexpected status/time at step ' + index);
        if (step.expectedPoints !== undefined && Math.abs(result.answer.points - step.expectedPoints) > 1e-10)
            throw new Error('Unexpected points at step ' + index);
        state = result.state;
        trace.push(result);
    });
    var ranking = KuikuizEngine.ranking(state);
    if (state.answers.length !== fixture.expectedAnswerCount || JSON.stringify(ranking.map(function (r) { return r.rank; })) !== JSON.stringify(fixture.expectedRanks))
        throw new Error('Unexpected final ranking/count');
    return JSON.stringify({ trace: trace, ranking: ranking });
}
