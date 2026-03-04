"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAvatarPrompt = buildAvatarPrompt;
exports.buildAvatarPromptWithMeta = buildAvatarPromptWithMeta;
const FACE_PRESETS = {
    friendly_confident: [
        "Moderately large expressive eyes,",
        "small nose,",
        "soft rounded cheeks,",
        "friendly confident smile.",
        "Cute but not childish.",
    ].join("\n"),
    cute_shy: [
        "Soft wide eyes with a gentle sparkle,",
        "small rounded nose,",
        "blushing rounded cheeks,",
        "slight shy smile.",
        "Cute but not childish.",
    ].join("\n"),
    calm_gentle: [
        "Relaxed almond-shaped eyes,",
        "small neat nose,",
        "smooth rounded cheeks,",
        "calm gentle smile.",
        "Cute but not childish.",
    ].join("\n"),
    bright_energetic: [
        "Bright lively eyes,",
        "small button nose,",
        "slightly lifted cheeks,",
        "cheerful energetic smile.",
        "Cute but not childish.",
    ].join("\n"),
    cool_chic: [
        "Clear focused eyes,",
        "small sharp nose,",
        "clean rounded cheeks,",
        "subtle cool chic smile.",
        "Cute but not childish.",
    ].join("\n"),
    playful_mischievous: [
        "Curious sparkling eyes,",
        "small playful nose,",
        "plump rounded cheeks,",
        "playful mischievous grin.",
        "Cute but not childish.",
    ].join("\n"),
    nerdy_focus: [
        "Attentive concentrated eyes,",
        "small tidy nose,",
        "gentle rounded cheeks,",
        "focused warm smile.",
        "Cute but not childish.",
    ].join("\n"),
    elegant_warm: [
        "Graceful soft eyes,",
        "small refined nose,",
        "smooth rounded cheeks,",
        "elegant warm smile.",
        "Cute but not childish.",
    ].join("\n"),
};
const ACTION_PRESETS = {
    playing_video_game: "playing a video game",
    playing_tennis: "playing tennis",
    listening_music: "listening to music with headphones",
    reading_book: "reading a book calmly",
    drinking_coffee: "drinking coffee in a cozy pose",
    taking_photo: "taking a photo with a small camera",
    drawing_sketch: "drawing on a sketchbook",
    jogging_lightly: "jogging lightly",
    weight_training: "hodling a dumbbell",
    cooking_simple: "cooking something simple",
    traveling_backpack: "traveling with a tiny backpack",
};
const OUTFIT_PRESETS = {
    sporty_hoodie: "Simple sporty hoodie, no complex patterns.",
    varsity_jacket: "Minimal varsity jacket, simple logo-free.",
    knit_sweater: "Clean knit sweater, solid color.",
    windbreaker: "Light windbreaker, sporty minimal.",
    tshirt_cardigan: "Simple t-shirt + cardigan, no patterns.",
    zipup_jacket: "Minimal zip-up jacket, neutral tone.",
    sweatshirt_oversized: "Basic sweatshirt, oversized but neat.",
    polo_shirt: "Simple polo shirt, clean fit.",
    denim_jacket: "Casual denim jacket, no patches.",
    leggings_hoodie: "Sporty leggings with hoodie, no patterns.",
};
const TEMPLATE = `Create a single square 1:1 profile avatar.

Style: stylized 3D cartoon character, simple clean shapes, soft pastel black and white color palette.
NOT photorealistic. NOT realistic. NOT human-like proportions.
More like a character illustration than a real animal.

Subject:
{ANIMAL_LINE}
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
const ACTION_RULES = [
    { keywords: ["게임", "video game", "콘솔", "pc"], preset: "playing_video_game" },
    { keywords: ["테니스", "tennis"], preset: "playing_tennis" },
    { keywords: ["음악", "music", "기타", "피아노", "밴드"], preset: "listening_music" },
    { keywords: ["독서", "책", "reading"], preset: "reading_book" },
    { keywords: ["카페", "커피"], preset: "drinking_coffee" },
    { keywords: ["사진", "camera"], preset: "taking_photo" },
    { keywords: ["그림", "드로잉", "drawing"], preset: "drawing_sketch" },
    { keywords: ["러닝", "조깅", "running"], preset: "jogging_lightly" },
    { keywords: ["헬스", "헬스장"], preset: "weight_training" },
    { keywords: ["요리", "cooking"], preset: "cooking_simple" },
    { keywords: ["여행", "travel"], preset: "traveling_backpack" },
];
const FACE_RULES = [
    { keywords: ["자신감", "당당", "리더"], preset: "friendly_confident" },
    { keywords: ["수줍", "내향", "부끄"], preset: "cute_shy" },
    { keywords: ["차분", "조용", "따뜻"], preset: "calm_gentle" },
    { keywords: ["활발", "에너지", "외향"], preset: "bright_energetic" },
    { keywords: ["쿨", "시크", "도도"], preset: "cool_chic" },
    { keywords: ["장난", "유쾌", "개구"], preset: "playful_mischievous" },
    { keywords: ["공부", "덕후", "집중", "nerd"], preset: "nerdy_focus" },
    { keywords: ["우아", "성숙", "배려"], preset: "elegant_warm" },
];
function buildAvatarPrompt(input) {
    return buildAvatarPromptWithMeta(input).prompt;
}
function buildAvatarPromptWithMeta(input) {
    const animal = sanitizeAnimal(input.animal);
    const interests = normalizeKeywords(input.interests);
    const traits = normalizeKeywords(input.traits);
    const animalLine = `Adorable anthropomorphic ${animal} character.`;
    const faceKey = chooseFacePreset(traits);
    const actionKey = chooseActionPreset(interests);
    const outfitKey = chooseOutfitPreset({
        gender: input.gender ?? "other",
        traits,
    });
    const prompt = TEMPLATE.replace("{ANIMAL_LINE}", animalLine)
        .replace("{FACE_BLOCK}", FACE_PRESETS[faceKey])
        .replace("{ACTION_BLOCK}", ACTION_PRESETS[actionKey])
        .replace("{OUTFIT_BLOCK}", OUTFIT_PRESETS[outfitKey]);
    return {
        prompt,
        meta: {
            animal,
            normalizedInterests: interests,
            normalizedTraits: traits,
            actionPreset: actionKey,
            facePreset: faceKey,
            outfitPreset: outfitKey,
        },
    };
}
function chooseActionPreset(interests) {
    for (const rule of ACTION_RULES) {
        if (hasKeywordMatch(interests, rule.keywords))
            return rule.preset;
    }
    return "playing_video_game";
}
function chooseFacePreset(traits) {
    for (const rule of FACE_RULES) {
        if (hasKeywordMatch(traits, rule.keywords))
            return rule.preset;
    }
    return "friendly_confident";
}
function chooseOutfitPreset(input) {
    const sporty = hasKeywordMatch(input.traits, ["운동", "스포츠", "활동"]);
    const neat = hasKeywordMatch(input.traits, ["깔끔", "미니멀", "단정"]);
    if (sporty) {
        if (input.gender === "female")
            return "leggings_hoodie";
        if (input.gender === "male")
            return "windbreaker";
        return "windbreaker";
    }
    if (neat) {
        return input.gender === "male" ? "sweatshirt_oversized" : "knit_sweater";
    }
    return "sporty_hoodie";
}
function sanitizeAnimal(value) {
    const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
    const safe = raw.replace(/[^a-z0-9 _-]/g, "").trim();
    return safe || "hamster";
}
function normalizeKeywords(values) {
    if (!Array.isArray(values))
        return [];
    return values
        .filter((v) => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
}
function hasKeywordMatch(values, keywords) {
    return values.some((value) => keywords.some((kw) => value.includes(kw.toLowerCase())));
}
/*
샘플 1) 서울대/남/햄스터/게임/자신감
buildAvatarPrompt({
  gender: "male",
  animal: "hamster",
  interests: ["게임"],
  traits: ["자신감"],
});

샘플 2) 여/토끼/테니스/차분
buildAvatarPrompt({
  gender: "female",
  animal: "bunny",
  interests: ["테니스"],
  traits: ["차분함"],
});

샘플 3) 성별없음/고양이/음악+사진/쿨
buildAvatarPrompt({
  gender: "other",
  animal: "cat",
  interests: ["음악", "사진"],
  traits: ["쿨"],
});
*/
//# sourceMappingURL=avatarPromptBuilder.js.map