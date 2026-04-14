/**
 * The Library — 60 curated memento mori quotes for fz.ax's rotating
 * footer. Each quote is ≤ 160 chars to keep the layout stable across
 * viewports. Mixed voices: Stoic (Marcus Aurelius, Seneca), Zen (Bashō,
 * Thich Nhat Hanh), contemporary (Burkeman, Dillard), and a few
 * anonymous aphorisms from the memento mori tradition.
 *
 * Short excerpts with attribution qualify as fair use for a personal
 * non-commercial site. Attributions are the shortest recognizable form.
 */

export interface LibraryQuote {
  readonly text: string
  readonly attribution: string
}

export const LIBRARY_QUOTES: readonly LibraryQuote[] = [
  { text: 'You could leave life right now. Let that determine what you do and say and think.', attribution: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', attribution: 'Marcus Aurelius' },
  { text: 'The soul becomes dyed with the color of its thoughts.', attribution: 'Marcus Aurelius' },
  { text: "Loss is nothing else but change, and change is Nature's delight.", attribution: 'Marcus Aurelius' },
  { text: 'Accept the things to which fate binds you.', attribution: 'Marcus Aurelius' },
  { text: 'The present is the only thing of which a man can be deprived.', attribution: 'Marcus Aurelius' },
  { text: 'Each day provides its own gifts.', attribution: 'Marcus Aurelius' },
  { text: 'Confine yourself to the present.', attribution: 'Marcus Aurelius' },
  { text: 'How much time he saves who does not look to see what his neighbor says or does.', attribution: 'Marcus Aurelius' },
  { text: 'Death smiles at us all; all we can do is smile back.', attribution: 'Marcus Aurelius' },

  { text: 'We are always complaining that our days are few, and acting as though there would be no end of them.', attribution: 'Seneca' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', attribution: 'Seneca' },
  { text: 'While we are postponing, life speeds by.', attribution: 'Seneca' },
  { text: 'You act like mortals in all that you fear, and like immortals in all that you desire.', attribution: 'Seneca' },
  { text: 'Life is long enough, if you know how to use it.', attribution: 'Seneca' },
  { text: 'Whatever can happen at any time can happen today.', attribution: 'Seneca' },
  { text: 'No man is more unhappy than he who never faces adversity.', attribution: 'Seneca' },
  { text: 'Begin at once to live.', attribution: 'Seneca' },

  { text: 'The average human lifespan is absurdly, terrifyingly, insultingly short.', attribution: 'Oliver Burkeman' },
  { text: "You almost certainly won't have time for everything you want to do.", attribution: 'Oliver Burkeman' },
  { text: 'The day will never arrive when you finally have everything under control.', attribution: 'Oliver Burkeman' },
  { text: 'Doing something you deeply care about is more important than a comprehensive to-do list.', attribution: 'Oliver Burkeman' },
  { text: 'What you pay attention to is your life.', attribution: 'Oliver Burkeman' },
  { text: 'Four thousand weeks. That is how long you have.', attribution: 'Oliver Burkeman' },

  { text: 'How we spend our days is, of course, how we spend our lives.', attribution: 'Annie Dillard' },
  { text: 'You were set here to give voice to your own astonishment.', attribution: 'Annie Dillard' },
  { text: 'There is no shortage of good days. It is good lives that are hard to come by.', attribution: 'Annie Dillard' },
  { text: 'A schedule defends from chaos and whim.', attribution: 'Annie Dillard' },

  { text: 'The journey itself is my home.', attribution: 'Matsuo Bashō' },
  { text: 'Every day is a journey, and the journey itself is home.', attribution: 'Matsuo Bashō' },
  { text: 'Do not seek to follow in the footsteps of the wise. Seek what they sought.', attribution: 'Matsuo Bashō' },

  { text: 'Memento mori. Remember that you must die.', attribution: 'stoic tradition' },
  { text: 'Nothing is more precious than the present moment.', attribution: 'Thich Nhat Hanh' },
  { text: 'Every breath is a debt repaid.', attribution: 'anonymous' },
  { text: 'You are never the same twice. Neither is the world.', attribution: 'anonymous' },
  { text: 'The clock speaks, but no one listens.', attribution: 'anonymous' },
  { text: 'We are dying from the moment we are born.', attribution: 'anonymous' },
  { text: 'One day you will die. That is the gift.', attribution: 'anonymous' },

  { text: 'All things flow.', attribution: 'Heraclitus' },
  { text: 'You cannot step twice into the same river.', attribution: 'Heraclitus' },
  { text: 'Everything flows and nothing abides.', attribution: 'Heraclitus' },
  { text: 'Life is short, art is long.', attribution: 'Hippocrates' },

  { text: 'He who has a why to live can bear almost any how.', attribution: 'Friedrich Nietzsche' },
  { text: 'To live is to suffer, to survive is to find meaning in the suffering.', attribution: 'Friedrich Nietzsche' },
  { text: "And now that you don't have to be perfect, you can be good.", attribution: 'John Steinbeck' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', attribution: 'Oscar Wilde' },
  { text: 'The days are long but the years are short.', attribution: 'Gretchen Rubin' },
  { text: 'Time is what we want most, but what we use worst.', attribution: 'William Penn' },
  { text: 'Lost time is never found again.', attribution: 'Benjamin Franklin' },

  { text: 'Yesterday is gone. Tomorrow has not yet come. We have only today.', attribution: 'Mother Teresa' },
  { text: 'The trouble is, you think you have time.', attribution: 'attributed to Buddha' },
  { text: 'Do not dwell in the past, do not dream of the future. Concentrate on the present.', attribution: 'attributed to Buddha' },
  { text: 'Impermanence is the essence of everything.', attribution: 'Buddhist tradition' },
  { text: 'The wound is the place where the light enters you.', attribution: 'Rumi' },
  { text: "You are the sky. Everything else — it's just the weather.", attribution: 'Pema Chödrön' },

  { text: 'There is always time for one more breath.', attribution: 'anonymous' },
  { text: 'The unexamined life is not worth living.', attribution: 'Socrates' },
  { text: 'I have lived many lives. All of them mine.', attribution: 'anonymous' },
  { text: 'Be here. Be here. Be here.', attribution: 'anonymous' },
  { text: 'What you are, you are by accident of birth; what I am, I am by myself.', attribution: 'Ludwig van Beethoven' },
] as const
