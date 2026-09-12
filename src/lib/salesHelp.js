// Curated conversation guidance. Examples are practice ideas, never claimed results.
export const goals = [
  'Discover their goal',
  'Secondary income',
  'Explore a hobby',
  'Career growth',
  'Build a business',
]
export const objections = [
  'Just exploring',
  'Too expensive',
  'No time',
  'Office tools restricted',
  'Free videos are enough',
  'Not technical',
  'Need to think',
  'Not interested',
]

const profiles = [
  {
    id: 'teaching',
    test: /teacher|teach|tutor|professor|educat|trainer/,
    title: 'Turn what they know into a small learning resource',
    project:
      'a five-question practice pack for one topic they already teach, with an answer key they check themselves',
    audience: 'two learners or parents they already know',
    question: 'Is there a topic your students keep asking you to explain, even after class?',
    horizon:
      'After useful feedback, they could explore a small tutoring resource or workshop. Quality and demand come before charging.',
  },
  {
    id: 'finance',
    test: /account|financ|bank|audit|\bca\b/,
    title: 'Use their expertise beyond the office',
    project:
      'a plain-language guide to reading a payslip, using invented numbers and explanations they verify',
    audience: 'two friends starting their first job',
    question: 'What money-related topics do friends ask you to help them understand?',
    horizon:
      'An educational series could help them develop a public body of work. Keep it educational and avoid personal financial advice.',
  },
  {
    id: 'engineering',
    test: /engineer|develop|software|\bit\b|tech|analyst|data/,
    title: 'Make a small project they can actually show',
    project:
      'a personal hobby tracker with a short walkthrough explaining what works, what failed, and how they tested it',
    audience: 'a friend with the same hobby',
    question: 'Outside work, have you ever wanted to build a small tool for yourself?',
    horizon:
      'A working, reviewed project can become a portfolio example. It does not establish job readiness or guarantee paid work.',
  },
  {
    id: 'business',
    test: /business|owner|entrepreneur|shop|retail|sales|market|freelanc/,
    title: 'Test one small offer with someone they know',
    project:
      'three product descriptions and a one-page catalogue for a fictional local shop, checked for accuracy and tone',
    audience: 'one shop owner who can give honest feedback',
    question:
      'Does someone you know run a business whose products you would enjoy helping present more clearly?',
    horizon:
      'If an owner finds the sample useful, they could discuss one tightly scoped trial. Customers, revisions, and reliable delivery still matter.',
  },
  {
    id: 'student',
    test: /student|graduate|fresher|college|job.?seek/,
    title: 'Build evidence of a skill they want to use',
    project:
      'a short explainer on a topic they understand, with a storyboard, a fact-checked script, and a finished sample',
    audience: 'a peer or mentor',
    question:
      'Beyond a certificate, what would you like to create that demonstrates what you can do?',
    horizon:
      'Several revised samples can help start conversations about their interests. A certificate or AI tool alone is not a job outcome.',
  },
  {
    id: 'general',
    test: /./,
    title: 'Start with something people already ask them for',
    project:
      'a short beginner guide to something they know well, with their own examples and a checklist they test',
    audience: 'two people who actually need that help',
    question: 'Outside work, what do friends usually ask you to help with?',
    horizon:
      'A useful guide could become a small personal project or a service experiment, depending on feedback and interest.',
  },
]

const hobbies = [
  {
    test: /cook|bak|food|recipe/,
    project:
      'a five-recipe beginner collection using their own recipes, with clear instructions and photos they have permission to use',
    question:
      'Would you enjoy teaching someone to make your favourite dish? For now, just think about creating and sharing something you enjoy.',
  },
  {
    test: /photo|travel/,
    project:
      'a photo story or short local travel guide using their own photos and first-hand recommendations',
    question:
      'Is there a place or photo story you have wanted to share but never got around to creating?',
  },
  {
    test: /music|sing|guitar|dance/,
    project:
      'a four-part beginner practice series with their own demonstrations and a clear progression',
    question:
      'If creating a first version felt a little easier, what would you like to teach or perform?',
  },
  {
    test: /writ|poe|story|read/,
    project:
      'a short illustrated story or newsletter issue built from their own idea, edited in their own voice',
    question: 'Is there a story or topic you have wanted to write about for a while?',
  },
  {
    test: /design|art|draw|paint|craft/,
    project:
      'a small collection of original designs with a process page showing their choices and revisions',
    question: 'If you picked one small weekend project, what would you enjoy making?',
  },
  {
    test: /fitness|sport|gym/,
    project:
      'a personal training journal or story about their own sporting journey, without prescribing health advice',
    question: 'Would you enjoy documenting your progress or sharing your own journey?',
  },
]

export function inferGoal(text = '') {
  // A short keyword matcher cannot reliably interpret negation. Ask instead.
  if (/\b(no|not|never|nahi|nahin|nhi|don't|dont)\b/i.test(text)) return 'Discover their goal'
  if (/\b(income|side hustle|earn|earning|earnings|freelance|freelancing)\b/i.test(text))
    return 'Secondary income'
  if (/hobb|passion|creative/i.test(text)) return 'Explore a hobby'
  if (/business|customer|shop|entrepreneur/i.test(text)) return 'Build a business'
  if (/career|job|promot|portfolio/i.test(text)) return 'Career growth'
  return 'Discover their goal'
}

export function buildGuidance(context) {
  const role = (context.role || '').trim()
  const interest = (context.interest || '').trim()
  const purpose = (context.purpose || '').trim()
  const goal = context.goal === 'Discover their goal' ? inferGoal(purpose) : context.goal
  const profile = profiles.find((p) => p.test.test(role.toLowerCase())) || profiles.at(-1)
  const hobby = hobbies.find((h) => h.test.test(interest.toLowerCase()))
  const project = interest
    ? hobby?.project ||
      `a small beginner resource about ${interest}, using their own knowledge and examples`
    : profile.project
  const discovery = purpose
    ? `You mentioned “${purpose}”. What would be a useful first result for you?`
    : 'You made time for a three-hour workshop. Was there anything in particular you hoped to try afterward?'
  const cards = [
    {
      id: 'personal',
      title: interest ? `Make room for ${interest}` : 'Find the interest behind the workshop',
      tag: 'PERSONAL INTEREST',
      line:
        hobby?.question ||
        (interest
          ? `You mentioned ${interest}. Is there something around that you have wanted to create or share but never started?`
          : 'Is there a hobby or idea you have wanted to explore but struggled to find time for or get started with?'),
      question:
        'Where do you usually get stuck: choosing an idea, making it happen, or finding the time?',
      example: project,
      next: 'Pick one tiny version they would enjoy finishing. Let AI help with an outline or first draft; their taste, checks, and revisions make it useful.',
      fit: 'Only connect this to the course after checking that it teaches the relevant workflow.',
    },
    {
      id: 'income',
      title: 'Explore a small second-income experiment',
      tag: 'SECONDARY INCOME',
      line: 'Would trying a small paid project outside work interest you, or is extra income simply not a priority right now?',
      question: `Who could benefit from something you already know? ${profile.question}`,
      example: profile.project,
      next: `First show a sample to ${profile.audience}. Ask what is useful and what is missing before proposing any paid work.`,
      fit: 'AI may help make a draft. Expertise, demand, quality, outreach, and time are still needed; there is no assured income or fee recovery.',
    },
    {
      id: 'expertise',
      title: profile.title,
      tag: 'EXISTING STRENGTH',
      line: profile.question,
      question:
        'Would you rather make something for yourself, help someone else, or create a sample you can show?',
      example: profile.project,
      next: profile.horizon,
      fit: 'Use public, invented, or personally owned material. Check the actual course syllabus before promising this outcome.',
    },
  ]
  const preferred =
    goal === 'Secondary income' || goal === 'Build a business'
      ? 'income'
      : goal === 'Career growth'
        ? 'expertise'
        : 'personal'
  cards.sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred))
  return { goal, discovery, cards, matched: profile.id !== 'general' }
}

export function courseConnection(context, angleId) {
  const interest = (context.interest || '').toLowerCase()
  if (angleId === 'personal' && /cook|bak|food|recipe/.test(interest))
    return {
      topic: 'Video generation + research',
      line: 'Imagine making a short video of your own recipe. AI could help explore shot ideas, a draft script, and visuals, while you bring the recipe and cooking. You could test one sample with two people — would you enjoy trying that?',
    }
  if (angleId === 'personal' && /photo|travel|design|art|draw|paint|craft/.test(interest))
    return {
      topic: 'Image generation + video generation',
      line: 'Imagine creating a visual project you care about. You could explore a moodboard and visual variations with AI, then use your own judgement and editing to finish a sample. Does an idea come to mind?',
    }
  if (
    /account|financ|bank|audit|\bca\b/.test((context.role || '').toLowerCase()) &&
    angleId !== 'personal'
  )
    return {
      topic: 'Data analysis + research',
      line: 'You could explain something you already know through a simple example, such as reading a fictional payslip. AI could help draft different explanations and visuals, with you checking accuracy. Would that be useful for someone starting their first job?',
    }
  if (
    /teach|tutor|professor|educat/.test((context.role || '').toLowerCase()) &&
    angleId !== 'personal'
  )
    return {
      topic: 'Research + image generation',
      line: 'Think of a small practice pack for a topic you teach well. AI could draft questions at different difficulty levels and visual explanations, with you verifying the answers. Try it with two students first — does it help them understand?',
    }
  return {
    topic: 'Research + image and video generation',
    line: 'Think about a small sample of this idea. AI could help explore research questions, an outline, and visual options, with you checking the facts and quality. Who would you show it to for honest feedback?',
  }
}

export const objectionHelp = {
  'Just exploring': [
    'What caught your interest in the workshop, and what would you like to understand better?',
    'Understand their curiosity before bringing up a purchase.',
  ],
  'Too expensive': [
    'Is ₹35,000 beyond your budget right now, or is it still unclear how you would use what you learn?',
    'For a value concern, return to one relevant project and verify course fit. If it is unaffordable, do not use registration to sidestep the full cost.',
  ],
  'No time': [
    'In a normal week, how much time could you realistically set aside for practice?',
    'Compare their answer with the actual course workload. If it does not fit, agree on a later conversation rather than promising effortless learning.',
  ],
  'Office tools restricted': [
    'Understood. Would a personal project outside work interest you, or was improving your office work the main reason you joined?',
    'Use their own or fictional material outside office systems. If work use is the only goal, acknowledge the restriction instead of suggesting a workaround.',
  ],
  'Free videos are enough': [
    'Absolutely, free videos can help you learn. Have you chosen a project and a learning sequence, or are you still figuring out where to start?',
    'If self-study is working, acknowledge it. Explain paid structure or feedback only if the course actually provides it and they want it.',
  ],
  'Not technical': [
    'Which part feels difficult: using the tool, asking the right questions, or checking whether the result is correct?',
    'Offer a small example at their level. Verify prerequisites and support instead of claiming that everyone will find it easy.',
  ],
  'Need to think': [
    'Of course, take your time. What would you like to clarify before deciding?',
    'Answer that question and ask whether they want a follow-up. Agree on a time only with their permission.',
  ],
  'Not interested': [
    'Understood. Thank you for taking the time to speak with me.',
    'End the pitch. Do not turn a clear no into another objection to overcome.',
  ],
}
