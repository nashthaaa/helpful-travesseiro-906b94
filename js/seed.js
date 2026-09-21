// Stage 2 seed data. In Stage 3 this moves into the database.
//
// Only "Shifaa's Veggie Pasta" is real content, taken from the existing mockups.
// The five entries marked `sample: true` exist so the collection page has
// something to filter and search. They carry no stories or photographs, and can
// be deleted once real recipes are added.

const SAMPLE_COOK = 'Sample cook';

export const SEED = [
  {
    id: 'shifaas-veggie-pasta',
    number: 8,
    title: "Shifaa's Veggie Pasta",
    contributor: 'Shifaa',
    category: 'dinner',
    tagline: 'For weeknights, new roommates, and the last tomato in the fridge.',
    quote: 'The first thing we made in the new flat. It tasted like arriving.',
    servings: 2,
    ingredients: [
      { amount: 250, unit: 'g', item: 'fusilli or whatever is open' },
      { amount: 2, unit: 'handfuls', item: 'cherry tomatoes, halved' },
      { amount: 1, unit: '', item: 'small courgette', note: 'sliced' },
      { amount: 2, unit: 'cloves', item: 'garlic, finely chopped' },
      { amount: 3, unit: 'tbsp', item: 'cream cheese or soft cheese' },
      { amount: null, unit: '', item: 'lemon, parmesan, basil', note: 'to finish' },
    ],
    steps: [
      'Put the pasta water on first. Salt it until it tastes like the sea, then cook the pasta just shy of done.',
      'Let the tomatoes and courgette catch some colour in olive oil. Add garlic only when the room smells good.',
      'Loosen the cheese with a splash of pasta water. Toss everything together until glossy.',
      'Finish with lemon, basil, and too much parmesan. Eat from the warm pan if you want.',
    ],
    note: {
      text: 'The vegetables are only a suggestion. The point is to use what is almost going bad.',
      by: 'Shifaa',
    },
    photo: {
      src: 'assets/photos/veggie-pasta-portrait.jpg', w: 680, h: 850,
      alt: 'A bowl of creamy fusilli with halved cherry tomatoes, courgette and basil, on a blue linen cloth',
      caption: 'best eaten at the table',
    },
    photos: [{
      src: 'assets/photos/veggie-pasta-bowl.jpg', w: 684, h: 680,
      alt: 'The same bowl of pasta seen from above, with a glass of water and a small dish of parmesan beside it',
      caption: 'leave the spoon in',
    }],
    memories: [{
      src: 'assets/photos/old-kitchen-2018.jpg', w: 504, h: 432,
      alt: 'Black and white photograph of three friends laughing around a kitchen table',
      caption: 'the old kitchen, 2018',
    }],
    createdAt: '2026-09-21T12:00:00Z',
  },

  {
    id: 'sample-sunday-pancakes',
    sample: true,
    title: 'Sunday Pancakes',
    contributor: SAMPLE_COOK,
    category: 'breakfast',
    servings: 4,
    ingredients: [
      { amount: 200, unit: 'g', item: 'plain flour' },
      { amount: 2, unit: 'tsp', item: 'baking powder' },
      { amount: 1, unit: 'pinch', item: 'salt' },
      { amount: 300, unit: 'ml', item: 'milk' },
      { amount: 1, unit: '', item: 'egg' },
      { amount: 2, unit: 'tbsp', item: 'butter, melted', note: 'plus more for the pan' },
    ],
    steps: [
      'Whisk the flour, baking powder and salt together in a large bowl.',
      'Add the milk, egg and melted butter. Stir until just combined; a few lumps are fine.',
      'Cook spoonfuls in a hot, buttered pan until bubbles appear, then flip and cook until golden.',
    ],
    photos: [], memories: [],
    createdAt: '2026-09-21T11:50:00Z',
  },
  {
    id: 'sample-tomato-soup',
    sample: true,
    title: 'Tomato Soup',
    contributor: SAMPLE_COOK,
    category: 'lunch',
    servings: 4,
    ingredients: [
      { amount: 1, unit: 'tbsp', item: 'olive oil' },
      { amount: 1, unit: '', item: 'onion, chopped' },
      { amount: 2, unit: 'cloves', item: 'garlic, sliced' },
      { amount: 800, unit: 'g', item: 'tinned tomatoes' },
      { amount: 500, unit: 'ml', item: 'vegetable stock' },
      { amount: null, unit: '', item: 'salt and pepper', note: 'to taste' },
    ],
    steps: [
      'Soften the onion in the oil over a gentle heat, then add the garlic for a minute.',
      'Add the tomatoes and stock. Simmer for 20 minutes.',
      'Blend until smooth, season, and serve with something to dip.',
    ],
    photos: [], memories: [],
    createdAt: '2026-09-21T11:40:00Z',
  },
  {
    id: 'sample-egg-fried-rice',
    sample: true,
    title: 'Egg Fried Rice',
    contributor: SAMPLE_COOK,
    category: 'dinner',
    servings: 2,
    ingredients: [
      { amount: 300, unit: 'g', item: 'cooked rice, cold' },
      { amount: 2, unit: '', item: 'eggs' },
      { amount: 2, unit: '', item: 'spring onions, sliced' },
      { amount: 1, unit: 'tbsp', item: 'soy sauce' },
      { amount: 1, unit: 'tbsp', item: 'neutral oil' },
    ],
    steps: [
      'Heat the oil in a wide pan until it shimmers. Scramble the eggs quickly and push them aside.',
      'Add the rice and press it into the pan so it crisps in places.',
      'Stir in the soy sauce and spring onions, and serve straight away.',
    ],
    photos: [], memories: [],
    createdAt: '2026-09-21T11:30:00Z',
  },
  {
    id: 'sample-lemon-loaf',
    sample: true,
    title: 'Lemon Loaf',
    contributor: SAMPLE_COOK,
    category: 'dessert',
    servings: 8,
    ingredients: [
      { amount: 200, unit: 'g', item: 'self-raising flour' },
      { amount: 150, unit: 'g', item: 'caster sugar' },
      { amount: 100, unit: 'g', item: 'butter, softened' },
      { amount: 3, unit: '', item: 'eggs' },
      { amount: 2, unit: '', item: 'lemons', note: 'zest and juice' },
    ],
    steps: [
      'Beat the butter and sugar until pale, then beat in the eggs one at a time.',
      'Fold in the flour and lemon zest, then spoon into a lined loaf tin.',
      'Bake at 170°C for about 45 minutes. Pour the lemon juice over while it is still warm.',
    ],
    photos: [], memories: [],
    createdAt: '2026-09-21T11:20:00Z',
  },
  {
    id: 'sample-crispy-chickpeas',
    sample: true,
    title: 'Crispy Chickpeas',
    contributor: SAMPLE_COOK,
    category: 'snacks',
    servings: 2,
    ingredients: [
      { amount: 1, unit: 'tin', item: 'chickpeas, drained and dried' },
      { amount: 1, unit: 'tbsp', item: 'olive oil' },
      { amount: 1, unit: 'tsp', item: 'smoked paprika' },
      { amount: null, unit: '', item: 'salt', note: 'to taste' },
    ],
    steps: [
      'Toss the chickpeas with the oil, paprika and salt.',
      'Roast at 200°C for 25 to 30 minutes, shaking the tray halfway.',
    ],
    photos: [], memories: [],
    createdAt: '2026-09-21T11:10:00Z',
  },
];
