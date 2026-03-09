export type AvatarPromptInput = {
  gender?: "male" | "female" | "other" | null;
  animal?: string | null;
  mbti?: string | null;
  interests?: string[] | null;
  traits?: string[] | null;
};

export type AvatarPromptMeta = {
  animal: string;
  normalizedInterests: string[];
  normalizedTraits: string[];
  normalizedMbti: string;
  actionPreset: ActionPresetKey;
  facePreset: FacePresetKey;
  outfitPreset: OutfitPresetKey;
  genderStylePreset: GenderStylePresetKey;
  hasGlasses: boolean;
};

type FacePresetKey =
  | "lively_bright"
  | "calm_soft"
  | "shy_gentle"
  | "playful_fun"
  | "smart_composed"
  | "warm_kind"
  | "cool_stylish"
  | "confident_direct";

type GenderStylePresetKey =
  | "masculine_soft"
  | "feminine_soft"
  | "neutral_balanced";

type ActionPresetKey =
  | "gym_workout"
  | "running"
  | "hiking"
  | "swimming"
  | "yoga_pilates"
  | "ball_sports"
  | "climbing"
  | "cycling"
  | "surfing"
  | "winter_sports"
  | "online_gaming"
  | "board_game"
  | "watching_sports"
  | "watching_esports"
  | "watching_movie_drama"
  | "reading"
  | "music_appreciation"
  | "exhibition_visit"
  | "fan_activity"
  | "photo_taking"
  | "content_creating"
  | "playing_instrument"
  | "writing"
  | "reading_webtoon"
  | "self_improvement"
  | "investing"
  | "volunteering"
  | "traveling"
  | "driving"
  | "walking"
  | "foodie_tour"
  | "cafe_hopping"
  | "with_pet"
  | "interior_styling"
  | "fashion_styling"
  | "shopping"
  | "cooking_baking"
  | "wine_whisky"
  | "traditional_liquor"
  | "default_action";

type OutfitPresetKey =
  | "clean_breezy"
  | "modern_city"
  | "neat_minimal"
  | "pure_soft"
  | "hip_street"
  | "emotional_layered"
  | "casual_comfy";

const FACE_PRESETS: Record<FacePresetKey, string> = {
  lively_bright: [
    "Bright lively eyes,",
    "small button nose,",
    "slightly lifted cheeks,",
    "cheerful energetic smile.",
    "Cute but not childish.",
  ].join("\n"),

  calm_soft: [
    "Relaxed almond-shaped eyes,",
    "small neat nose,",
    "smooth rounded cheeks,",
    "calm gentle smile.",
    "Cute but not childish.",
  ].join("\n"),

  shy_gentle: [
    "Soft wide eyes with a gentle sparkle,",
    "small rounded nose,",
    "blushing rounded cheeks,",
    "slight shy smile.",
    "Cute but not childish.",
  ].join("\n"),

  playful_fun: [
    "Curious sparkling eyes,",
    "small playful nose,",
    "plump rounded cheeks,",
    "playful mischievous grin.",
    "Cute but not childish.",
  ].join("\n"),

  smart_composed: [
    "Attentive concentrated eyes,",
    "small tidy nose,",
    "gentle rounded cheeks,",
    "focused warm smile.",
    "Cute but not childish.",
  ].join("\n"),

  warm_kind: [
    "Graceful soft eyes,",
    "small refined nose,",
    "smooth rounded cheeks,",
    "elegant warm smile.",
    "Cute but not childish.",
  ].join("\n"),

  cool_stylish: [
    "Clear focused eyes,",
    "small sharp nose,",
    "clean rounded cheeks,",
    "subtle cool chic smile.",
    "Cute but not childish.",
  ].join("\n"),

  confident_direct: [
    "Moderately large expressive eyes,",
    "small nose,",
    "soft rounded cheeks,",
    "friendly confident smile.",
    "Cute but not childish.",
  ].join("\n"),
};

const GENDER_STYLE_PRESETS: Record<GenderStylePresetKey, string> = {
  masculine_soft: [
    "Slightly broader upper-body silhouette,",
    "clean and softly defined face details,",
    "relaxed confident overall impression.",
  ].join("\n"),

  feminine_soft: [
    "Slightly slimmer soft silhouette,",
    "gentle and delicately softened face details,",
    "soft elegant overall impression.",
  ].join("\n"),

  neutral_balanced: [
    "Balanced neutral silhouette,",
    "soft clean face details,",
    "calm balanced overall impression.",
  ].join("\n"),
};

const ACTION_PRESETS: Record<ActionPresetKey, string> = {
  gym_workout: "holding a dumbbell naturally",
  running: "running lightly",
  hiking: "hiking with a small backpack",
  swimming: "wearing simple swim gear in a clean swimming pose",
  yoga_pilates: "doing a gentle stretching pose on a yoga mat",
  ball_sports: "playing a ball sport naturally",
  climbing: "posing as if climbing an indoor wall",
  cycling: "standing in a relaxed cycling pose",
  surfing: "holding a small surfboard in a relaxed pose",
  winter_sports: "wearing simple winter sports gear in a relaxed pose",
  online_gaming: "playing a video game",
  board_game: "playing a board game with a small game piece",
  watching_sports: "cheering while watching a sports game",
  watching_esports: "watching an esports match with focused excitement",
  watching_movie_drama: "watching a movie",
  reading: "reading a book calmly",
  music_appreciation: "listening to music with headphones",
  exhibition_visit: "looking at an artwork in a gallery-like pose",
  fan_activity: "holding a small fan item in a cheerful pose",
  photo_taking: "taking a photo with a small camera",
  content_creating: "creating content with a small camera setup",
  playing_instrument: "playing a musical instrument naturally",
  writing: "writing in a notebook calmly",
  reading_webtoon: "reading on a tablet casually",
  self_improvement: "studying with a notebook in a focused pose",
  investing: "looking at a tablet thoughtfully",
  volunteering: "holding a small donation box in a kind pose",
  traveling: "traveling with a tiny backpack",
  driving: "enjoying a relaxed road-trip mood",
  walking: "walking leisurely",
  foodie_tour: "holding a small snack happily",
  cafe_hopping: "drinking coffee in a cozy pose",
  with_pet: "gently sitting with a small pet companion",
  interior_styling: "arranging a small home object carefully",
  fashion_styling: "posing as if showing a styled outfit confidently",
  shopping: "holding a small shopping bag casually",
  cooking_baking: "cooking something simple",
  wine_whisky: "holding a simple glass elegantly",
  traditional_liquor: "holding a traditional-style drink cup calmly",
  default_action: "standing still",
};

const OUTFIT_PRESETS: Record<OutfitPresetKey, string> = {
  clean_breezy:
    "Clean light outfit with a fresh sporty mood, minimal and neat.",
  modern_city:
    "Modern city-style outfit, sleek and polished, no complex patterns.",
  neat_minimal:
    "Simple neat outfit with a minimal clean fit.",
  pure_soft:
    "Soft clean outfit with a gentle and pure mood, simple and tidy.",
  hip_street:
    "Trendy street-style outfit, youthful and stylish, no loud graphics.",
  emotional_layered:
    "Soft layered outfit with an artistic and cozy mood.",
  casual_comfy:
    "Casual comfortable outfit, simple and friendly, no complex patterns.",
};

const TEMPLATE = `Create a single square 1:1 profile avatar.

Style: stylized 3D cartoon character, simple clean shapes, soft pastel black and white color palette.
NOT photorealistic. NOT realistic. NOT human-like proportions.
More like a character illustration than a real animal.

Subject:
{ANIMAL_LINE}
{GENDER_STYLE_BLOCK}
total body view, 1:1 ratio torso and head, centered but with breathing room.
Body proportions cartoonish (rounded shapes, simplified limbs).

Face:
{FACE_BLOCK}

Action:
{ACTION_BLOCK}
Keep the pose elegant and relaxed (not exaggerated, not dramatic).

Background:
Clean pastel black and white background with ONE subtle soft music-note silhouette or faint light glow behind the character.
Minimal and uncluttered.

Outfit:
{OUTFIT_BLOCK}

Avoid:
realistic fur texture, realistic lighting, excessive detail, complex background,
dramatic rockstar pose, exaggerated motion, ugly, creepy, scary, grotesque, meme,
deformed, extra limbs, blurry.

No text, no watermark, no logo.`;

const ACTION_RULES: Array<{ keywords: string[]; preset: ActionPresetKey }> = [
  { keywords: ["헬스"], preset: "gym_workout" },
  { keywords: ["러닝"], preset: "running" },
  { keywords: ["등산"], preset: "hiking" },
  { keywords: ["수영"], preset: "swimming" },
  { keywords: ["요가/필라테스"], preset: "yoga_pilates" },
  { keywords: ["구기 종목"], preset: "ball_sports" },
  { keywords: ["클라이밍"], preset: "climbing" },
  { keywords: ["자전거"], preset: "cycling" },
  { keywords: ["서핑"], preset: "surfing" },
  { keywords: ["스키,스노보드"], preset: "winter_sports" },

  { keywords: ["온라인 게임"], preset: "online_gaming" },
  { keywords: ["보드게임"], preset: "board_game" },
  { keywords: ["스포츠 관람"], preset: "watching_sports" },
  { keywords: ["e스포츠 관람"], preset: "watching_esports" },
  { keywords: ["영화 및 드라마 시청"], preset: "watching_movie_drama" },
  { keywords: ["독서"], preset: "reading" },
  { keywords: ["음악 감상"], preset: "music_appreciation" },
  { keywords: ["공연 및 전시회 관람"], preset: "exhibition_visit" },
  { keywords: ["팬활동"], preset: "fan_activity" },
  { keywords: ["사진 촬영"], preset: "photo_taking" },
  { keywords: ["콘텐츠 제작"], preset: "content_creating" },
  { keywords: ["악기 연주"], preset: "playing_instrument" },
  { keywords: ["글쓰기"], preset: "writing" },
  { keywords: ["웹툰"], preset: "reading_webtoon" },

  { keywords: ["자기계발"], preset: "self_improvement" },
  { keywords: ["투자"], preset: "investing" },
  { keywords: ["봉사활동"], preset: "volunteering" },
  { keywords: ["여행"], preset: "traveling" },
  //{ keywords: ["드라이브"], preset: "driving" },
  { keywords: ["산책"], preset: "walking" },
  { keywords: ["맛집 탐방"], preset: "foodie_tour" },
  { keywords: ["카페 탐방"], preset: "cafe_hopping" },
  { keywords: ["반려동물"], preset: "with_pet" },
  { keywords: ["인테리어"], preset: "interior_styling" },
  { keywords: ["패션"], preset: "fashion_styling" },
  { keywords: ["쇼핑"], preset: "shopping" },
  { keywords: ["요리/베이킹"], preset: "cooking_baking" },
  { keywords: ["와인/위스키"], preset: "wine_whisky" },
  { keywords: ["전통주"], preset: "traditional_liquor" },
];

const FACE_RULES: Array<{ keywords: string[]; preset: FacePresetKey }> = [
  { keywords: ["활발한", "외향적인", "밝은 성격", "긍정적인"], preset: "lively_bright" },
  { keywords: ["차분한", "안정적인", "조용한 성격", "여유로운"], preset: "calm_soft" },
  { keywords: ["내향적인", "감성적인"], preset: "shy_gentle" },
  { keywords: ["유머있는", "즉흥적인"], preset: "playful_fun" },
  { keywords: ["이성적인", "현실적인", "지적인", "계획적인"], preset: "smart_composed" },
  { keywords: ["다정한"], preset: "warm_kind" },
  { keywords: ["센스있는", "성숙한"], preset: "cool_stylish" },
  { keywords: ["도전적인", "솔직한"], preset: "confident_direct" },
];

const OUTFIT_RULES: Array<{ keywords: string[]; preset: OutfitPresetKey }> = [
  { keywords: ["청량한"], preset: "clean_breezy" },
  { keywords: ["세련된", "도시적인"], preset: "modern_city" },
  { keywords: ["단정한"], preset: "neat_minimal" },
  { keywords: ["청순한"], preset: "pure_soft" },
  { keywords: ["힙한"], preset: "hip_street" },
  { keywords: ["감성적인"], preset: "emotional_layered" },
  { keywords: ["캐주얼한"], preset: "casual_comfy" },
];

const MBTI_ANIMAL_MAP: Record<string, string> = {
  INFP: "rabbit",
  INFJ: "deer",
  INTP: "marten",
  INTJ: "fennec fox",
  ISFP: "hamster",
  ISFJ: "otter",
  ISTP: "cat",
  ISTJ: "brown bear",
  ENFP: "bichon dog",
  ENFJ: "retriever dog",
  ENTP: "fox",
  ENTJ: "tiger",
  ESFP: "orca",
  ESFJ: "sheep",
  ESTP: "wolf",
  ESTJ: "doberman dog",
};

export function buildAvatarPrompt(input: AvatarPromptInput): string {
  return buildAvatarPromptWithMeta(input).prompt;
}

export function buildAvatarPromptWithMeta(input: AvatarPromptInput): {
  prompt: string;
  meta: AvatarPromptMeta;
} {
  const normalizedMbti = normalizeMbti(input.mbti);
  const animal = chooseAnimal({
    rawAnimal: input.animal,
    mbti: normalizedMbti,
  });
  const interests = normalizeKeywords(input.interests);
  const traits = normalizeKeywords(input.traits);

  const hasGlasses = hasKeywordMatch(traits, ["안경"]);
  const faceKey = chooseFacePreset(traits);
  const actionKey = chooseActionPreset(interests);
  const outfitKey = chooseOutfitPreset(traits);
  const genderStyleKey = chooseGenderStylePreset(input.gender);

  const animalLine = `Adorable anthropomorphic ${animal} character.`;
  const faceBlock = withGlasses(FACE_PRESETS[faceKey], hasGlasses);
  const genderStyleBlock = GENDER_STYLE_PRESETS[genderStyleKey];

  const prompt = TEMPLATE.replace("{ANIMAL_LINE}", animalLine)
    .replace("{GENDER_STYLE_BLOCK}", genderStyleBlock)
    .replace("{FACE_BLOCK}", faceBlock)
    .replace("{ACTION_BLOCK}", ACTION_PRESETS[actionKey])
    .replace("{OUTFIT_BLOCK}", OUTFIT_PRESETS[outfitKey]);

  return {
    prompt,
    meta: {
      animal,
      normalizedInterests: interests,
      normalizedTraits: traits,
      normalizedMbti,
      actionPreset: actionKey,
      facePreset: faceKey,
      outfitPreset: outfitKey,
      genderStylePreset: genderStyleKey,
      hasGlasses,
    },
  };
}

function chooseAnimal(input: {
  rawAnimal?: string | null;
  mbti: string;
}): string {
  const sanitized = sanitizeAnimal(input.rawAnimal);
  if (sanitized) return sanitized;
  return MBTI_ANIMAL_MAP[input.mbti] ?? "hamster";
}

function chooseActionPreset(interests: string[]): ActionPresetKey {
  for (const rule of ACTION_RULES) {
    if (hasKeywordMatch(interests, rule.keywords)) return rule.preset;
  }
  return "default_action";
}

function chooseFacePreset(traits: string[]): FacePresetKey {
  for (const rule of FACE_RULES) {
    if (hasKeywordMatch(traits, rule.keywords)) return rule.preset;
  }
  return "confident_direct";
}

function chooseOutfitPreset(traits: string[]): OutfitPresetKey {
  for (const rule of OUTFIT_RULES) {
    if (hasKeywordMatch(traits, rule.keywords)) return rule.preset;
  }
  return "casual_comfy";
}

function chooseGenderStylePreset(
  gender?: "male" | "female" | "other" | null
): GenderStylePresetKey {
  if (gender === "male") return "masculine_soft";
  if (gender === "female") return "feminine_soft";
  return "neutral_balanced";
}

function withGlasses(faceBlock: string, hasGlasses: boolean): string {
  if (!hasGlasses) return faceBlock;
  return [faceBlock, "Wearing simple round glasses."].join("\n");
}

function normalizeMbti(value?: string | null): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function sanitizeAnimal(value?: string | null): string {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "";
  const safe = raw.replace(/[^a-z0-9 _-]/g, "").trim();
  return safe;
}

function normalizeKeywords(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function hasKeywordMatch(values: string[], keywords: string[]): boolean {
  return values.some((value) =>
    keywords.some((kw) => value.includes(kw.toLowerCase()))
  );
}