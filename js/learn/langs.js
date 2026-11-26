// 첫 삽 v21 — 언어 목록. 순서 근거: docs/다국어_근거.md
// 1차: 건설근로자공제회 「건설현장 리포트 — 외국인 근로자편」(2025.5) 7쪽, 2024년 국적 확인 외국인 건설근로자 49,371명의 출신 국가 순
//      (한국계 중국인 83.7·중국 5.9 → 중국어, 베트남 2.2, 고려인 1.7·카자흐스탄 0.9 → 러시아어, 우즈베키스탄 1.6, 미얀마 1.3, 캄보디아 1.1, 태국 246명(12쪽)) + 영어(공통)
// 2차: 고용허가제(E-9) 송출국(통계청 지표 1501) 중 1차에 없는 나라의 언어
// tier 1 = 화면 문구 전체 + 교육 문장, tier 2 = 같은 범위(번역 파일이 있는 것만 고를 수 있음)
// 모든 번역은 AI(Claude) 초안 — 원어민 검수 전. 번역 파일 meta.reviewed 로 표시
export const LANGS = [
  { id: 'ko', name: '한국어', tts: 'ko-KR' },
  { id: 'zh', name: '中文(简体)', tts: 'zh-CN', tier: 1, who: '한국계 중국인·중국' },
  { id: 'vi', name: 'Tiếng Việt', tts: 'vi-VN', tier: 1, who: '베트남' },
  { id: 'ru', name: 'Русский', tts: 'ru-RU', tier: 1, who: '고려인·카자흐스탄·중앙아시아' },
  { id: 'uz', name: 'Oʻzbekcha', tts: 'uz-UZ', tier: 1, who: '우즈베키스탄' },
  { id: 'my', name: 'မြန်မာ', tts: 'my-MM', tier: 1, who: '미얀마' },
  { id: 'km', name: 'ភាសាខ្មែរ', tts: 'km-KH', tier: 1, who: '캄보디아' },
  { id: 'th', name: 'ไทย', tts: 'th-TH', tier: 1, who: '태국' },
  { id: 'en', name: 'English', tts: 'en-US', tier: 1, who: '공통' },
  { id: 'id', name: 'Bahasa Indonesia', tts: 'id-ID', tier: 2, who: '인도네시아' },
  { id: 'fil', name: 'Filipino', tts: 'fil-PH', tier: 2, who: '필리핀' },
  { id: 'mn', name: 'Монгол', tts: 'mn-MN', tier: 2, who: '몽골' },
  { id: 'ne', name: 'नेपाली', tts: 'ne-NP', tier: 2, who: '네팔' },
  { id: 'si', name: 'සිංහල', tts: 'si-LK', tier: 2, who: '스리랑카' },
  { id: 'bn', name: 'বাংলা', tts: 'bn-BD', tier: 2, who: '방글라데시' },
  { id: 'ur', name: 'اردو', tts: 'ur-PK', tier: 2, who: '파키스탄', rtl: true },
  { id: 'ky', name: 'Кыргызча', tts: 'ky-KG', tier: 2, who: '키르기스스탄' },
  { id: 'kk', name: 'Қазақша', tts: 'kk-KZ', tier: 2, who: '카자흐스탄' },
  { id: 'lo', name: 'ລາວ', tts: 'lo-LA', tier: 2, who: '라오스' },
  { id: 'tet', name: 'Tetun', tts: 'tet', tier: 2, who: '동티모르' },
  { id: 'tg', name: 'Тоҷикӣ', tts: 'tg-TJ', tier: 2, who: '타지키스탄' },
];
export const langOf = (id) => LANGS.find((l) => l.id === id) || LANGS[0];
