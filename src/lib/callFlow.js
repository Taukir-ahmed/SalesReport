export const researchSources = [
  {
    title: 'SPIN Selling · Neil Rackham / Huthwaite',
    url: 'https://www.huthwaiteinternational.com/blog/spin-selling-questions',
    note: 'Discover a specific gap, explore its impact, then ask the client to describe the value of changing it.',
  },
  {
    title: 'Influence · Robert Cialdini',
    url: 'https://www.influenceatwork.com/7-principles-of-persuasion/',
    note: 'Use relevant expertise and voluntary commitments. Scarcity must be real; credentials and social proof need evidence.',
  },
  {
    title: 'Never Split the Difference · Chris Voss / Black Swan',
    url: 'https://www.blackswanltd.com/newsletter/how-to-get-buy-in-with-the-3-most-effective-calibrated-questions',
    note: 'Reflect what you heard and ask open what/how questions instead of arguing against their position.',
  },
]

const item = (title, line, expand, followUp, listenFor, principle) => ({
  title,
  line,
  expand,
  followUp,
  listenFor,
  principle,
})

export function localCallFlow(context) {
  const technical =
    /rag|mcp|llm|retriev|vector|ai project/i.test(context.knowledge || '') &&
    !/no |not |never|beginner|nahi|nhi/i.test(context.knowledge || '')
  const skill = (context.knowledge || '').trim()
  const purpose = (context.purpose || '').trim()
  const interest = (context.interest || '').trim()
  const opening = purpose
    ? `You mentioned “${purpose}” — what about that caught your interest?`
    : 'Are you more curious about understanding AI, or trying to build something with it?'
  return [
    item(
      'Meet them at their level',
      skill
        ? 'Given what you already know, where would you like to start exploring AI, and how deep would you like to go?'
        : opening,
      'Let them set the level. General curiosity is a valid answer; do not force an income or career goal.',
      'What did you see in the workshop that made you want to explore further?',
      'A specific topic, a surprising demo, or simple curiosity. Follow their answer.',
      'Curiosity'
    ),
    item(
      'Understand their learning style',
      'When you learn something new, do you start with documentation, watch videos, or jump straight into building something?',
      'Ask about what already works. Someone with a strong self-study habit may not need a paid course.',
      'What was the last thing you finished learning or building that way?',
      'A real completed example, or a pattern of collecting resources without finishing.',
      'Situation · SPIN'
    ),
    item(
      'Choose a real experiment',
      technical
        ? 'If you built an assistant for public documentation, would retrieval, answer quality, or tool integration interest you most?'
        : interest
          ? `If you tried a small AI experiment around ${interest}, what would you enjoy making?`
          : 'Think of a topic you enjoy — would making a short visual explainer about it be an interesting experiment?',
      technical
        ? 'Illustrative project: answer questions over public documentation. Explore how retrieved evidence supports an answer, how mistakes are measured, and which actions a tool is allowed to take. RAG and MCP solve different parts; neither guarantees reliability.'
        : 'Keep it personal and small: a story, visual explanation, or a comparison of public information. No workplace-tool adoption is needed.',
      'What would tell you that this project turned out well?',
      'Their own success criterion, not a borrowed aspiration.',
      'Concrete outcome'
    ),
    item(
      'Find the interesting gap',
      technical
        ? 'Once the demo works, how would you check that its answers are reliable and supported by the right sources?'
        : 'When you see an AI output, how do you decide whether it is useful or simply looks impressive?',
      'Explore evidence, checking, and judgement. Do not turn this into a quiz designed to embarrass them.',
      'How do you check that today?',
      'A gap they recognise themselves. If they already have a good answer, go deeper or move on.',
      'Problem · SPIN'
    ),
    item(
      'Compare routes fairly',
      'Would more content help you most, or would specific feedback from someone experienced be more useful for your approach?',
      technical
        ? 'Contrast a tutorial with a design discussion: why this retrieval strategy, what test failed, what trade-off changed the design? These are questions to ask of a course, not services to assume it includes.'
        : 'Separate information, practice, sequence, and feedback. Free learning can be enough; paid learning needs a clear additional benefit.',
      'What kind of feedback would be difficult to get through your own research?',
      'Whether feedback is actually wanted. Do not claim mentorship or review is included without confirmation.',
      'Choice and relevance'
    ),
    item(
      'Make expertise specific',
      technical
        ? 'If you could speak with an experienced engineer, which real design decision would you want them to walk you through?'
        : 'If you could ask an experienced trainer one question about your project, what would you ask?',
      'Translate authority into an inspectable question. Google/Microsoft experience alone does not establish teaching quality, access, or course fit. Ask for a real trainer profile and relevant project example.',
      'Would seeing a breakdown of their actual work help you judge whether their teaching is relevant?',
      'The evidence they want: sample lesson, syllabus depth, project feedback, or prerequisites.',
      'Relevant authority · Cialdini'
    ),
    item(
      'Explore the cost of waiting',
      'If you spent another month exploring, would something meaningful remain on hold, or does that pace work for you?',
      'Let them name a real trade-off: a postponed project, untested idea, or unused learning time. If there is no cost to waiting, accept it. Never invent job-loss fear or a deadline.',
      'When would starting make sense for you, and why?',
      'A real personal timeline. Their answer may be “later”.',
      'Implication · SPIN'
    ),
    item(
      'Picture a useful milestone',
      technical
        ? 'Would having a tested project and being able to explain your design decisions feel like a worthwhile milestone to work toward?'
        : 'Looking a month ahead, what would count as progress for you: understanding AI better, completing a small project, or something else?',
      'A possible milestone, not a promise of what this course delivers in one month. Let the client change the scope and timeline.',
      'What difference would that make for you personally?',
      'A benefit expressed in their own words. If nothing matters yet, keep the call exploratory.',
      'Need-payoff · SPIN'
    ),
    item(
      'Reflect, then check',
      'It sounds like finding a relevant direction matters to you — have I understood that correctly, or am I missing your point?',
      'Replace this summary with their actual words. Pause and invite correction. Agreement should reflect understanding, not repeated yes-questions.',
      'Have I missed anything that matters more to you?',
      'A correction or a clear statement of what would be useful.',
      'Reflective listening · Voss'
    ),
    item(
      'Let them choose the next step',
      'Would you prefer to try an experiment independently first, or look at the relevant course material and compare your options?',
      'Bridge only after they see a reason. If they want the course, show relevant evidence and explain the full fee and registration terms separately. A real deadline can be shared with its date and reason; never create one.',
      'What is the one thing you would need to clarify before deciding?',
      'Permission to show course fit, a self-study plan, or an agreed follow-up. Respect a clear no.',
      'Voluntary commitment · Cialdini'
    ),
  ]
}
