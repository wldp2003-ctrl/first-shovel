// 첫 삽 v12 — 직접 그린 SVG 아이콘 한 벌 (24×24 격자, 선 굵기 2, 끝·모서리 둥글게, 채움 없음)
// 이모지 대신 씀: 기기마다 모양이 같고, 글과 함께 놓아 뜻을 분명히 한다.
const P = {
  // 메뉴
  learn: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  review: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
  record: '<path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/>',
  practice: '<path d="M5 21V4h3v17"/><path d="M8 6h12"/><path d="M8 6l4-2"/><path d="M17 6v5"/><rect x="15" y="11" width="4" height="3" rx="1"/><path d="M3 21h18"/>',
  // 레슨 6개 대표 그림
  site: '<path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/><path d="M2 21h20"/>',
  words: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8"/><path d="M8 12h5"/>',
  ppe: '<path d="M4.5 16a7.5 7.5 0 0 1 15 0"/><path d="M2.5 16h19v2.5h-19z"/><path d="M10 9V6.5a2 2 0 0 1 4 0V9"/>',
  accidents: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/>',
  fire: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4-3-6-4-10-1.5 2-2 3.5-2 5-1-1-2-1.5-2.5-3C7 9 5.5 11.5 5.5 14.5A6.5 6.5 0 0 0 12 21z"/><path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.3-2.5 2.5-4.5 1.2 2 2.5 2.9 2.5 4.5A2.5 2.5 0 0 1 12 21z"/>',
  stop: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.6 16a1.5 1.5 0 0 1 2.3-1.9L8 16"/>',
  // 상태·동작
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  retry: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  streak: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
  sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  vibrate: '<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4 9v6M20 9v6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z"/>',
  time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cert: '<rect x="4" y="3.5" width="16" height="13" rx="2"/><path d="M8 8h8M8 11h5"/><circle cx="15" cy="17.5" r="2.5"/><path d="M13.5 19.5 13 22l2-1 2 1-.5-2.5"/>',
  download: '<path d="M12 4v11"/><path d="M7 10.5 12 15.5l5-5"/><path d="M5 20h14"/>',
  // v12.1 게임 화면용 (이모지 대신)
  map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  money: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 9l2 7 1.5-5 1.5 5 2-7M8 12h8"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 10a4.3 4.3 0 0 0 1 8.5z"/>',
  rain: '<path d="M7 14.5h10a3.5 3.5 0 0 0 .3-7A5.5 5.5 0 0 0 6.3 7.3 3.6 3.6 0 0 0 7 14.5z"/><path d="M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  fog: '<path d="M7 10.5h10a3.5 3.5 0 0 0 .3-7"/><path d="M3.5 14h17M5.5 17.5h13M8 21h8"/>',
  storm: '<path d="M7 13.5h10a3.5 3.5 0 0 0 .3-7A5.5 5.5 0 0 0 6.3 6.3 3.6 3.6 0 0 0 7 13.5z"/><path d="M12.5 13.5 10 18h4l-2.5 4"/>',
  wind: '<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h16a3 3 0 1 1-3 3M3 16.5h8"/>',
  drop: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  light: '<path d="M5 4h8l-1.5 5h-5z"/><path d="M7 9v11h3V9"/><path d="M16 5l4-1.5M16 8h4.5M16 11l4 1.5"/>',
  idea: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1v1.5h5V16c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  note: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v2.5H9zM8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  edit: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  up: '<path d="M12 20V5M5.5 11 12 4.5 18.5 11"/>',
  stairs: '<path d="M3 20h4.5v-4.5H12V11h4.5V6.5H21"/>',
  worker: '<circle cx="12" cy="9.5" r="3.5"/><path d="M7.5 7.5a4.5 4 0 0 1 9 0z M6.5 7.5h11"/><path d="M5 21a7 6 0 0 1 14 0"/>',
  warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  door: '<path d="M5 21V3.5h11V21M3 21h18"/><path d="M13 12h.01"/>',
  chat: '<path d="M4 5.5h16v10H10l-4.5 4v-4H4z"/>',
  together: '<circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20a6 5.5 0 0 1 12 0M12 15.2a6 5.5 0 0 1 9.5 4.8"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-5-5l2.5 2.5-1 2.5-2.5 1z"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4.5l3 3.5v3h-7.5"/><circle cx="6.5" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  shop: '<path d="M3 4h2.5l2.2 11h10.6l2-8H6.5"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V21h14v-8.5M12 8.5V21M12 8.5C10 4 6 5 7.5 7.5 8.5 8.5 12 8.5 12 8.5zM12 8.5c2-4.5 6-3.5 4.5-1C15.5 8.5 12 8.5 12 8.5z"/>',
  hook: '<path d="M12 3v7"/><path d="M12 10a4.5 4.5 0 1 1-4.5 4.5"/><path d="M5.5 12.5l2 2 2-2"/>',
  aid: '<rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M9 6.5V4h6v2.5M12 10v6M9 13h6"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  test: '<path d="M9 3h6M10 3v6l-5 9.5A2 2 0 0 0 6.8 21h10.4a2 2 0 0 0 1.8-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  box: '<rect x="4.5" y="4.5" width="15" height="15" rx="3"/>',
  dot: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
  trash: '<path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5 7.5 21h9l1-14.5"/>',
  walk: '<circle cx="13.5" cy="4.5" r="2"/><path d="M10 21l2.5-6.5 2.5 2V21M12.5 14.5 11 9l4 1.5 2.5 3M11 9l-3.5 2.5-1 3"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M9 10h.01M15 10h.01M8.5 14.5q3.5 3 7 0"/>',
  'face-mid': '<circle cx="12" cy="12" r="8.5"/><path d="M9 10h.01M15 10h.01M9 15h6"/>',
  'face-low': '<circle cx="12" cy="12" r="8.5"/><path d="M9 10h.01M15 10h.01M8.5 16.5q3.5-3 7 0"/>',
  pin: '<path d="M12 21s-6.5-6.4-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.6 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  // v13 위험 종류 (경고 노랑 삼각형 안에 넣어 씀)
  fall: '<circle cx="14" cy="5" r="2"/><path d="M13 8l-4 5 3 2-1 5"/><path d="M9 13l-3-1"/><path d="M12 15l4 1"/><path d="M3 21h8"/><path d="M19 9v9"/><path d="M17 16l2 2 2-2"/>',
  trip: '<circle cx="9" cy="5" r="2"/><path d="M9 8l2 5 5 2"/><path d="M11 13l-4 3-2 4"/><path d="M9 9l-4 2"/><rect x="14" y="17" width="7" height="3" rx="1"/>',
  pierce: '<path d="M7 21V9l1.5-4L10 9v12"/><path d="M14 21V9l1.5-4L17 9v12"/><path d="M4 21h16"/>',
  struck: '<rect x="8" y="3" width="8" height="5" rx="1"/><path d="M12 8v4"/><path d="M10 10l2 2 2-2"/><path d="M6 21a6 5 0 0 1 12 0"/><circle cx="12" cy="15" r="2"/>',
  // v13 모드·반응
  hit: '<circle cx="6" cy="5" r="2"/><path d="M6 8v6l-2 6M6 14l2 6M6 10l3 2"/><rect x="12" y="10" width="9" height="7" rx="1"/><circle cx="14" cy="19" r="1.5"/><circle cx="19.5" cy="19" r="1.5"/><path d="M10.5 13.5h-1"/>',
  caught: '<rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1"/><path d="M9 16v-4.5a1.5 1.5 0 0 1 3 0V16M12 12a1.5 1.5 0 0 1 3 0v4"/>',
  collapse: '<path d="M3 21h18"/><rect x="5" y="15" width="6" height="6"/><rect x="12" y="7" width="7" height="5" transform="rotate(25 15.5 9.5)"/><path d="M7 11l1-3M11 6l1-3"/>',
  shock: '<path d="M13 2 5 13h6l-1 9 8-12h-6z"/>',
  suffocate: '<circle cx="7" cy="5" r="2.2"/><path d="M7 8v7M4 21l3-6 3 6M7 10l-3 3"/><path d="M13 7c2-2 4 0 6-2M13 12c2-2 4 0 6-2M13 17c2-2 4 0 6-2"/>',
  heat: '<path d="M8 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M10 9v7"/><circle cx="18" cy="6" r="2.5"/><path d="M18 1.5v1M22.5 6h-1M18 10.5v-1"/>',
  shovel: '<path d="M8 2.5h8M12 2.5V11"/><path d="M6.5 11h11v4c0 4.5-2.5 7-5.5 8.5C9 22 6.5 19.5 6.5 15z"/>',
  badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  textmode: '<path d="M5 6h14M5 10h14M5 14h10M5 18h7"/>',
  thumb: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.5 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>',
  finger: '<path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 9.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-2.6-3.6a1.5 1.5 0 0 1 2.3-1.9L9 15"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  cross: '<path d="M6 6l12 12M18 6 6 18"/>',
};

// 아이콘 SVG 문자열. size: 픽셀, cls: 추가 클래스
export function icon(name, { size = 24, cls = '' } = {}) {
  const d = P[name] || '';
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}
export const ICON_NAMES = Object.keys(P);

// 레슨별 아이콘·배지 색 (안전 표지 규칙: 금지·정지=빨강, 경고=노랑, 지시=파랑, 안내=초록, 중립=남색)
export const LESSON_ICON = { site: 'site', words: 'words', ppe: 'ppe', accidents: 'accidents', fire: 'fire', stop: 'stop' };
export const LESSON_TONE = { site: 'navy', words: 'navy', ppe: 'blue', accidents: 'yellow', fire: 'green', stop: 'red' };
