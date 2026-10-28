const ROBO_NOUNS = [
	"Robot",
	"Android",
	"Bot",
	"Cyborg",
	"Droid",
	"Automaton",
	"Mech",
	"Mechanoid",
	"Synth",
	"Synthetic",
	"Unit",
	"Drone",
	"Guardian",
	"Sentinel",
	"Watcher",
	"Operator",
	"Assembler",
	"Controller",
	"Processor",
	"Executor",
	"Observer",
	"Technician",
	"Engineer",
	"Servitor",
	"Prototype",
	"Machine",
	"Construct",
	"Golem",
	"AI",
	"Core",
];

const ADJECTIVES = [
	"Angry",
	"Kind",
	"Cheerful",
	"Gloomy",
	"Happy",
	"Sad",
	"Brave",
	"Clever",
	"Curious",
	"Calm",
	"Wild",
	"Silent",
	"Noisy",
	"Swift",
	"Slow",
	"Sneaky",
	"Honest",
	"Loyal",
	"Reckless",
	"Careful",
	"Shy",
	"Bold",
	"Friendly",
	"Grumpy",
	"Jolly",
	"Serious",
	"Playful",
	"Mysterious",
	"Glitchy",
	"Shiny",
	"Rusty",
	"Polished",
	"Sleepy",
	"Hyper",
	"Chaotic",
	"Orderly",
	"Radiant",
	"Shadowy",
	"Fierce",
	"Gentle",
	"Nimble",
	"Stubborn",
	"Patient",
	"Impatient",
	"Witty",
	"Daring",
	"Charming",
	"Eccentric",
	"Focused",
	"Dreamy",
];

function hashString(str) {
	// FNV-1a 32bit
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function generateRoboName(uuid) {
	const seedA = hashString(uuid + "_nou");
	const seedB = hashString(uuid + "_adj");

	const adjective = ADJECTIVES[seedB % ADJECTIVES.length];
	const noun = ROBO_NOUNS[seedA % ROBO_NOUNS.length];

	return `${adjective} ${noun}`;
}