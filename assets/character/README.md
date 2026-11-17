# 첫삽이 캐릭터 파일

- 원본: `js/learn/mascot.js` (`renderMascot({ pose, face, size })`). 이 폴더는 `node tools/make-mascot.mjs`로 만든 결과물 — 손으로 고치지 않는다.
- `body-*.svg` 자세 5개(머리 윤곽·안전모 포함, 표정 없음) 위에 `face-*.svg` 표정 7개를 같은 좌표(viewBox 0 0 200 240)로 겹친다.
- 자세: stand, wave, thumb, stop, proud / 표정: basic, joy, surprise, worry, think, firm, proud
- 자체 제작 (첫 삽 프로젝트). 기록: `data/media.json`
