import { Genre, Mood } from '@audius/sdk';

export { Genre, Mood };

export const ELECTRONIC_SUBGENRES = [
  'Techno',
  'Trap',
  'House',
  'Tech House',
  'Deep House',
  'Disco',
  'Electro',
  'Jungle',
  'Progressive House',
  'Hardstyle',
  'Glitch Hop',
  'Trance',
  'Future Bass',
  'Future House',
  'Tropical House',
  'Downtempo',
  'Drum & Bass',
  'Dubstep',
  'Jersey Club',
  'Vaporwave',
  'Moombahton'
] as const;

export const HOUSE_SUBGENRES = [
  'House',
  'Tech House',
  'Deep House',
  'Progressive House',
  'Future House',
  'Tropical House'
] as const;

export const SOMETIMES_ELECTRONIC = [
  'Hyperpop',
  'Dancehall',
  'Ambient',
  'Experimental',
  'Lo-Fi'
] as const;

export const GENRE_MAPPINGS = {
  'All Genres': ['all', 'everything', 'any'],
  'Hip-Hop/Rap': ['hip hop', 'hip-hop', 'rap', 'hiphop'],
  'Electronic': ['electronic', 'edm', 'electronica', ...ELECTRONIC_SUBGENRES.map(genre => genre.toLowerCase())],
  'Rock': ['rock', 'alternative rock', 'indie rock'],
  'Metal': ['metal', 'heavy metal', 'metallic'],
  'Pop': ['pop', 'popular'],
  'R&B/Soul': ['r&b', 'rnb', 'soul', 'rhythm and blues'],
  'Jazz': ['jazz', 'jazzy'],
  'Drum & Bass': ['drum and bass', 'drum & bass', 'dnb', 'd&b', 'jungle', 'liquid'],
  'House': ['house'],
  'Deep House': ['deep house'],
  'Tech House': ['tech house'],
  'Techno': ['techno'],
  'Trap': ['trap'],
  'Dubstep': ['dubstep'],
  'Alternative': ['alternative', 'alt', 'indie'],
  'Classical': ['classical', 'orchestra', 'orchestral'],
  'Ambient': ['ambient', 'atmospheric', 'background'],
  'World': ['world music', 'world', 'international'],
  'Progressive House': ['progressive house'],
  'Future Bass': ['future bass'],
  'Future House': ['future house'],
  'Tropical House': ['tropical house'],
  'Hardstyle': ['hardstyle'],
  'Glitch Hop': ['glitch hop'],
  'Trance': ['trance'],
  'Downtempo': ['downtempo'],
  'Jersey Club': ['jersey club'],
  'Vaporwave': ['vaporwave'],
  'Moombahton': ['moombahton'],
  'Disco': ['disco'],
  'Electro': ['electro'],
  'Jungle': ['jungle'],
  'Experimental': ['experimental', 'avant garde', 'avant-garde', 'weird'],
  'Punk': ['punk', 'punk rock'],
  'Folk': ['folk', 'folk music', 'traditional'],
  'Soundtrack': ['soundtrack', 'score', 'film music', 'movie music'],
  'Acoustic': ['acoustic', 'unplugged'],
  'Funk': ['funk', 'funky'],
  'Devotional': ['devotional', 'spiritual', 'religious', 'sacred', 'worship', 
    'christian', 'christianity', 'gospel', 'hymn', 'hymnal',
    'muslim', 'islam', 'islamic', 'quran', 'nasheed',
    'jewish', 'judaism', 'hebrew', 'synagogue',
    'hindu', 'hinduism', 'bhajan', 'kirtan',
    'buddhist', 'buddhism', 'meditation', 'mantra',
    'sikh', 'sikhism', 'gurbani', 'shabad',
    'pagan', 'wiccan', 'new age'],
  'Reggae': ['reggae', 'ska'],
  'Podcasts': ['podcast', 'podcasts', 'talk', 'host'],
  'Country': ['country', 'country music', 'western'],
  'Spoken Word': ['spoken word', 'poetry', 'speech'],
  'Comedy': ['comedy', 'funny', 'humorous'],
  'Blues': ['blues', 'bluesy'],
  'Kids': ['kids', 'children', 'family'],
  'Audiobooks': ['audiobook', 'audiobooks', 'book', 'reading', 'narrator', 'author'],
  'Latin': ['latin', 'latino', 'latina'],
  'Lo-Fi': ['lo-fi', 'lofi', 'low fidelity'],
  'Hyperpop': ['hyperpop', 'hyper pop', 'pc music'],
  'Dancehall': ['dancehall', 'dance hall']
} as const;

export type AudiusGenre = keyof typeof GENRE_MAPPINGS;

export const CALM_MOODS = [
  'Peaceful',
  'Tender',
  'Easygoing',
  'Sophisticated',
  'Melancholy',
  'Brooding',
  'Sentimental',
  'Yearning'
] as const;

export const NEUTRAL_MIXED_MOODS = [
  'Romantic',
  'Sensual',
  'Cool',
  'Serious',
  'Gritty',
  'Stirring',
  'Other'
] as const;

export const ENERGETIC_MOODS = [
  'Excited',
  'Energizing',
  'Empowering',
  'Fiery',
  'Defiant',
  'Aggressive',
  'Rowdy',
  'Upbeat'
] as const;

export const MOOD_MAPPINGS = {
  'Peaceful': ['peaceful', 'calm', 'serene', 'tranquil', 'gentle', 'quiet', 'relaxing', 'zen'],
  'Romantic': ['romantic', 'love', 'passion', 'intimate', 'affectionate', 'lovely', 'sweet', 'romance'],
  'Sentimental': ['sentimental', 'nostalgic', 'emotional', 'heartfelt', 'memories', 'feels', 'touching'],
  'Tender': ['tender', 'soft', 'delicate', 'sweet', 'gentle', 'warm', 'kind'],
  'Easygoing': ['easygoing', 'laid back', 'relaxed', 'casual', 'chill', 'mellow', 'lowkey', 'vibing', 'easy'],
  'Yearning': ['yearning', 'longing', 'desire', 'wistful', 'wanting', 'missing', 'need'],
  'Sophisticated': ['sophisticated', 'elegant', 'refined', 'polished', 'fancy', 'classy', 'smart'],
  'Sensual': ['sensual', 'sultry', 'seductive', 'sexy', 'intimate', 'steamy', 'hot'],
  'Cool': ['cool', 'smooth', 'suave', 'hip', 'slick', 'fresh', 'dope'],
  'Gritty': ['gritty', 'raw', 'rough', 'harsh', 'dirty', 'tough', 'hard'],
  'Melancholy': ['melancholy', 'sad', 'blue', 'sorrowful', 'somber', 'depressed', 'down', 'unhappy', 'sadness'],
  'Serious': ['serious', 'intense', 'profound', 'deep', 'heavy', 'real', 'truth'],
  'Brooding': ['brooding', 'dark', 'moody', 'contemplative', 'gloomy', 'thoughtful', 'depression'],
  'Fiery': ['fiery', 'passionate', 'intense', 'burning', 'hot', 'angry', 'mad', 'heated'],
  'Defiant': ['defiant', 'rebellious', 'resistant', 'bold', 'rebel', 'fighting', 'protest'],
  'Aggressive': ['aggressive', 'fierce', 'forceful', 'intense', 'angry', 'mad', 'fired up', 'rage'],
  'Rowdy': ['rowdy', 'wild', 'boisterous', 'unruly', 'crazy', 'loud', 'party', 'hype'],
  'Excited': ['excited', 'thrilled', 'enthusiastic', 'eager', 'happy', 'stoked', 'pumped', 'psyched'],
  'Energizing': ['energizing', 'invigorating', 'stimulating', 'dynamic', 'pumped', 'hyped', 'energy', 'power'],
  'Empowering': ['empowering', 'strong', 'confident', 'inspiring', 'motivated', 'powerful', 'strength'],
  'Stirring': ['stirring', 'moving', 'touching', 'rousing', 'powerful', 'deep', 'feels'],
  'Upbeat': ['upbeat', 'cheerful', 'positive', 'optimistic', 'happy', 'fun', 'good vibes', 'joy'],
  'Other': ['other', 'different', 'unique', 'miscellaneous', 'random', 'special', 'various']
} as const;

export type AudiusMood = keyof typeof MOOD_MAPPINGS;
