const insight = (insight, example, realityCheck) => ({ insight, example, realityCheck })

// Starter examples, not inferred client goals. Gemini adapts these ideas to their actual reply.
export function addCallInsights(steps, context, challenge = '') {
  const insights = [
    insight(
      'A useful next step with AI is giving it a clear brief and an example of a good result, so you have something specific to improve.',
      'For a short explainer, give it your intended audience, three facts, and a sample paragraph you like. Compare that draft with one made from a vague request.',
      'Examples guide a response; they do not automatically train the model or guarantee it remembers your preferences.'
    ),
    insight(
      'Trying the same small task before and after a lesson can show you what you actually learned, beyond recognising the tool names.',
      'Draft a short explanation today, learn one technique for specifying the audience, then revise it and compare clarity with a friend.',
      'Choose a task they care about. A course is only one way to learn a technique.'
    ),
    insight(
      'You could turn one idea into a repeatable process: a clear brief, a draft, a review checklist, and a finished sample.',
      'For a hobby guide, outline one page, draft it, check the instructions yourself, and test whether a beginner can follow it.',
      'Repeating a process is different from automating it. Connected tools and reliable checks require additional setup.'
    ),
    insight(
      'A good-looking answer can still be wrong; a few examples with known answers give you a way to test it before relying on it.',
      'Give it a small fictional table and ask for a total you have already calculated. Then change one value and check whether its explanation still holds.',
      'Passing a few checks is an early signal, not proof that every future answer will be correct.'
    ),
    insight(
      'A useful way to judge any learning route is whether it helps you explain your choices and fix a weak result, not just reproduce a demo.',
      'After following a tutorial, change the audience or the input. See whether you can adapt the result and explain why you changed it.',
      'Self-study can provide this too. Confirm the relevant teaching or feedback before claiming a course adds it.'
    ),
    insight(
      'An expert explanation becomes useful when it shows a failed attempt, the decision that changed it, and the evidence that the revision worked.',
      'Look for a sample lesson that compares two drafts and explains which one fits the audience better, rather than only showing a polished final result.',
      'Request a relevant sample; an employer name alone does not show teaching quality or access to that trainer.'
    ),
    insight(
      'A small trial can replace guesswork with evidence about whether this is worth your time, even if you are still deciding what to learn.',
      'Set aside one practice session to complete and check a tiny sample. Note where you got stuck and whether you enjoyed the work.',
      'This is a voluntary experiment, not a deadline to buy or a promise of time savings.'
    ),
    insight(
      'A finished sample plus a short explanation of what you corrected gives you more to discuss than simply saying you know an AI tool.',
      'Keep a first draft, a revised version, and three notes explaining the changes. Show the difference to someone who might use the result.',
      'A sample demonstrates that task; it does not guarantee employment, income, or readiness for an entire profession.'
    ),
    insight(
      'Your own review checklist can become a reusable brief, so the next attempt starts with clearer expectations instead of a blank prompt.',
      'If you keep correcting vague headings and long sentences, write those preferences into your next brief and compare the drafts.',
      'You must save and reuse the brief, or configure a supported instruction feature; do not assume automatic memory.'
    ),
    insight(
      'One small experiment can give you a better basis for choosing what to learn next: you will know which part you can manage and where help matters.',
      'Pick one sample and a success check. Try it independently or compare a relevant sample lesson, then decide which route meets the gap you found.',
      'Keep the choice open and verify course coverage before connecting this experiment to a purchase.'
    ),
  ]
  const result = steps.map((step, i) => ({ ...step, ...insights[i] }))
  const skills = context.knowledge || ''
  if (
    /rag|mcp|llm|retriev|vector|ai project/i.test(skills) &&
    !/no |not |never|beginner|nahi|nhi/i.test(skills)
  ) {
    Object.assign(
      result[2],
      insight(
        'A documentation assistant becomes more useful when you can trace an answer to the passage it used and test where retrieval fails.',
        'Use public documentation and ten questions with known answers. Inspect which passages are retrieved, then compare the answer with the source before changing the retrieval approach.',
        'Retrieval supplies context; it does not retrain the model or guarantee a correct answer. Source permissions and freshness still matter.'
      )
    )
    Object.assign(
      result[3],
      insight(
        'Separating retrieval checks from answer checks can show whether a failure comes from missing evidence or from how the model uses it.',
        'For a wrong answer, first check whether the relevant passage was retrieved. Then provide that passage directly and see whether the answer improves.',
        'This is a diagnostic experiment. Test on more than one example before concluding that the change improved reliability.'
      )
    )
    Object.assign(
      result[7],
      insight(
        'A project with documented failure cases gives you a concrete way to discuss engineering judgement, not just whether the demo runs.',
        'Keep three questions the assistant gets wrong, the changes you tried, and the before-and-after results. Explain one trade-off you chose rather than hiding the failures.',
        'A project can demonstrate those decisions; it does not guarantee hiring outcomes or prove production readiness.'
      )
    )
  }
  const actualContext = [context.knowledge, context.situation, context.purpose, challenge]
    .filter(Boolean)
    .join(' ')
  // A tool mentioned in the work or latest reply is context; a job title alone is not.
  if (/\bdax\b|power\s*bi/i.test(actualContext)) {
    result[0] = {
      ...result[0],
      title: 'Look beyond the formula',
      line: 'When you work on a report, which part takes the most effort after the DAX formula is ready?',
      ...insight(
        'If your setup supports it, Copilot in Power BI can also draft report pages from your model, giving you a starting point beyond individual formulas.',
        'On a sample sales model, try requesting a page that compares revenue by month and region. Review the selected measures, visuals, and filters.',
        'Check that Copilot is enabled and the model is supported. Generated pages still need review; this is not unattended dashboard delivery.'
      ),
      expand:
        'First establish which Copilot they use and whether Power BI report creation is available in their environment. Follow the part of report building they actually find difficult.',
      followUp:
        'Which part would you most want a draft for: choosing visuals, arranging the story, or explaining the numbers?',
      listenFor:
        'The actual bottleneck and available tools. If they only use another chat assistant, explain the distinction before suggesting this feature.',
    }
    result[2] = {
      ...result[2],
      title: 'Make their style reusable',
      line: 'Do you find yourself repeating the same formatting choices when you start a new report?',
      ...insight(
        'Power BI themes can preserve formatting defaults, and a saved report brief can capture your preferences; you do not need to explain everything from scratch each time.',
        'Reuse a theme for colours and fonts. Separately save a brief describing the audience, required measures, and preferred report structure for your next draft.',
        'Themes handle formatting defaults. Copilot report creation does not support styling changes; a saved brief is guidance, not automatic training or exact layout reproduction.'
      ),
      expand:
        'Offer this as a practical combination of an existing Power BI feature and a reusable instruction habit. Explore whether consistency or starting a first draft is their real concern.',
      followUp:
        'Which choices would you want to standardise, and which should stay different for each audience?',
      listenFor:
        'Repeated formatting or requirements. If they already use themes, ask about the next unsolved part instead.',
    }
    result[3] = {
      ...result[3],
      title: 'Review the meaning, not just the look',
      line: 'How do you check that a report answers the business question correctly once the visuals are ready?',
      ...insight(
        'A review checklist lets you focus on the meaning of a draft: whether the measure, date range, and filters answer the intended question.',
        'For a fictional revenue report, compare one known monthly total, change a region filter, and check that the measure still matches your definition.',
        'AI can suggest checks but cannot certify the business meaning. Keep access restrictions and review in place.'
      ),
      expand:
        'Connect the draft to their judgement. A chart can look convincing while using the wrong measure; keep the example small enough to check manually.',
      followUp: 'Which error would be most costly to miss in the reports you create?',
      listenFor:
        'Their real validation method. Build on it rather than suggesting they currently overlook errors.',
    }
    result[7] = {
      ...result[7],
      title: 'Test a complete draft workflow',
      line: 'Would one tested report workflow be a useful experiment before deciding how much further you want to learn?',
      ...insight(
        'You could combine a prepared model, a clear page request, reusable formatting, and a review checklist, then measure which parts actually become easier.',
        'Use invented sales data for a one-page trial. Record drafting time, corrections, and final accuracy before deciding whether the workflow is worth repeating.',
        'This is a proposed experiment, not a course deliverable or a guaranteed productivity gain. Setup and intermediate checks still take work.'
      ),
      expand:
        'Let them choose the success measure: fewer repeated edits, a clearer story, or faster drafting with equal accuracy. Use approved or fictional data.',
      followUp: 'What result would make that experiment worthwhile for you?',
      listenFor:
        'A measurable benefit they choose, including whether the setup effort would outweigh it.',
    }
  }
  return result
}

export function formatCallGuide(steps) {
  return steps
    .map(
      (step, i) =>
        `${i + 1}. ${step.line}\nShare: ${step.insight}\nExample: ${step.example}\nKeep in mind: ${step.realityCheck}\nThen ask: ${step.followUp}`
    )
    .join('\n\n')
}
