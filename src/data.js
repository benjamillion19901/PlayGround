const baseNames = [
  'sardine','anchovy','herring','mackerel','perch','smelt','minnow','sprat','goby','blenny','pilchard','shad','bluegill','sunfish','killifish','silverside','mullet','pinfish','pollock','capelin',
  'cod','haddock','hake','halibut','flounder','sole','turbot','plaice','rockfish','snapper','grouper','sea bass','redfish','lingcod','monkfish','tilefish','triggerfish','wrasse','parrotfish','butterflyfish',
  'mahi-mahi','wahoo','tuna','albacore','bonito','yellowtail','amberjack','barracuda','sailfish','marlin','swordfish','needlefish','flying fish','oarfish','ribbonfish','lanternfish','hatchetfish','dragonfish','viperfish','gulper eel',
  'moray eel','conger eel','wolf eel','sea robin','sculpin','lumpfish','lizardfish','stargazer','sand lance','sand eel','pipefish','seahorse','trumpetfish','cornetfish','pufferfish','porcupinefish','boxfish','filefish','cowfish','ocean sunfish',
  'squid','cuttlefish','octopus','nautilus','spiny lobster','shrimp','prawn','crab','king crab','blue crab','snow crab','spider crab','sea urchin','sea cucumber','jellyfish','salp','black swallower','fangtooth','sablefish','opah'
];

const baits = [
  { id: 'minnow', name: 'Silver minnow', icon: '◉', price: 8, desc: 'A lively all-rounder. Loved by coastal fish.', tags: ['small','coastal'] },
  { id: 'shrimp', name: 'Pink shrimp', icon: '❋', price: 12, desc: 'Sweet scent draws bottom feeders.', tags: ['bottom','crustacean'] },
  { id: 'squid', name: 'Striped squid', icon: '⌁', price: 16, desc: 'A meaty morsel for serious predators.', tags: ['predator','deep'] },
  { id: 'glowworm', name: 'Glow worm', icon: '✦', price: 22, desc: 'A luminous lure for the dark water.', tags: ['night','deep'] },
  { id: 'crab', name: 'Soft-shell crab', icon: '⌘', price: 30, desc: 'An irresistible treat for heavy fish.', tags: ['bottom','large'] }
];

const rods = [
  { id: 'deckhand', name: 'Deckhand 20', price: 0, power: 1, control: 1, desc: 'A dependable rod for learning the tides.' },
  { id: 'mariner', name: 'Mariner Carbon', price: 280, power: 1.28, control: 1.18, desc: 'Long casts and a forgiving backbone.' },
  { id: 'deepcurrent', name: 'Deep Current', price: 640, power: 1.55, control: 1.42, desc: 'Built to bring giants up from the dark.' }
];

const upgrades = [
  { id: 'reel', name: 'Sealed drag reel', price: 190, desc: 'Smoother drag keeps sudden runs under control.' },
  { id: 'line', name: 'Braided line', price: 240, desc: 'Higher breaking strength for trophy fish.' },
  { id: 'sonar', name: 'Pocket sonar', price: 320, desc: 'Reads depth and makes rare fish easier to find.' }
];

const rarity = [
  { name: 'Common', color: '#b5c8c8', weight: 62, price: 1 },
  { name: 'Uncommon', color: '#68d7b1', weight: 25, price: 2 },
  { name: 'Rare', color: '#76a9ff', weight: 10, price: 4 },
  { name: 'Epic', color: '#c18aff', weight: 2.5, price: 8 },
  { name: 'Legendary', color: '#ffc86b', weight: 0.5, price: 18 }
];
const variantKinds = [
  { name: 'Golden', color: '#ffcb5c', glow: '#ff9d26' },
  { name: 'Albino', color: '#f4e9dc', glow: '#ffcbb3' },
  { name: 'Shadow', color: '#584f83', glow: '#8268ff' },
  { name: 'Crystal', color: '#75e7e4', glow: '#57fff0' }
];

export const fishSpecies = baseNames.flatMap((name, i) => {
  const r = rarity[i % 5];
  const size = 14 + (i * 13 % 76);
  const depth = 4 + (i * 17 % 165);
  const strength = 0.72 + (i % 9) * 0.13;
  const favoriteBait = baits[i % baits.length].id;
  const common = {
    id: `${name.replaceAll(' ', '-')}`, name, rarity: r.name, rarityColor: r.color,
    minSize: Math.max(8, size - 7), maxSize: size + 22, minWeight: 0.15 + size / 160,
    maxWeight: 0.6 + size / 25, price: Math.round((5 + size * 1.7) * r.price), strength,
    depth, favoriteBait, length: 0.75 + size / 42, height: 0.19 + (i % 5) * 0.055,
    color: ['#5797a4','#b78d5a','#739b76','#6f829b','#c27659','#a4a880'][i % 6], pattern: i % 4,
    tail: i % 3, fins: i % 4, speciesIndex: i, variant: false
  };
  const v = variantKinds[i % variantKinds.length];
  const variant = { ...common, id: `${common.id}-${v.name.toLowerCase()}`, name: `${v.name} ${name}`, rarity: 'Mythic', rarityColor: v.color, color: v.color, glow: v.glow, price: common.price * 12, strength: common.strength * 1.4, variant: true };
  return [common, variant];
});

export const baitsData = baits;
export const rodsData = rods;
export const upgradesData = upgrades;
