# 코드 블루: 봉쇄 병원 탈출

대학교 2학년(주니어) 대상 의학용어 방탈출 웹 게임. 의학용어 200개를 8개 병동(병동당 25단어, 60분)으로 나누어
"학습 18분 → 탈출 40분" 흐름으로 진행합니다. 서버 없이 브라우저만 있으면 실행됩니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

배포용 정적 파일 만들기:

```bash
npm run build      # dist/ 폴더 생성 → 아무 정적 호스팅(GitHub Pages, Vercel, 학교 서버, USB)에 그대로 업로드
npm run preview    # 빌드 결과 미리보기
```

진행자 페이지: 게임 주소 뒤에 `#host` 를 붙입니다. (예: `http://localhost:5173/#host`)

## 게임 흐름

1. **타이틀** — 개인 플레이 / 팀 플레이(팀명·인원 등록) 선택
2. **병원 안내도(로비)** — 1F부터 순서대로 잠금 해제. "교수자 옵션 → 모든 병동 열기"로 순서 자유화 가능
3. **브리핑** — 병동 스토리
4. **환자 차트 열람(18분)** — 플래시카드 25장. "모르겠어요" 단어는 탈출 퍼즐에 우선 출제
5. **탈출(40분)** — 병동 장면의 오브젝트를 눌러 퍼즐 4개 해결 → 코드 조각 4개 → 문 키패드
   - 📋 환자 차트: 어근 조립 (형태소 타일 순서대로)
   - 🖥️ 모니터: 진단 내리기 (약어 해독 / 설명 보고 용어 고르기)
   - 💊 약품 보관함: 영어 ↔ 한글 짝 맞추기 8쌍
   - 📁 오염된 기록: 다른 병동에서 섞여 들어온 단어 찾기
   - 📢 긴급 방송: 10초 × 10문제 스피드 라운드 (보너스)
6. **디브리핑** — 점수·별점·복습 단어. 팀 모드는 **결과 코드** 표시 → 진행자 페이지 리더보드에 등록

### 점수
기본 1000 + 남은 시간 × 0.5 − 힌트 100 − 오답 20 + 스피드 정답 × 20. 별점: 1700↑ ★★★, 1300↑ ★★.
힌트는 병동당 3개(어근/뜻 → 첫 글자 → 정답). 키패드 3회 실패마다 1분 페널티. 5분 남으면 경보.

## 데이터

- `data/rooms/*.json` — 병동 8개. 각 파일에 스토리와 용어 25개(영어, 약어, 한글 뜻, 형태소 분해 `parts`, 설명 `desc`)
- `parts` 형식: `["형태소", "뜻", "p|r|s|w"]` (접두사/어근/접미사/단어)
- 용어를 고치려면 JSON만 수정하면 됩니다. 퍼즐은 데이터에서 자동 생성됩니다.
- 원본 엑셀과 비교: `npm run import:terms -- "<xlsx 경로>"` (누락·추가·뜻이 달라진 용어 리포트)
- 퍼즐 생성기 검증: `npx tsx scripts/check-puzzles.ts` (커버리지·재현성)

## 진행 저장
브라우저 localStorage에 저장됩니다(잠금 해제, 최고 점수, 약한 단어). 로비의 "진행 내보내기/가져오기"로 JSON 파일 백업 가능.

## 구조
```
src/engine/puzzleGen.ts   퍼즐 생성기(시드 고정, 커버리지 보장, 약한 단어 우선)
src/engine/scoring.ts     점수/별점
src/engine/resultCode.ts  팀 결과 코드 인코딩/디코딩
src/store/gameStore.ts    게임 상태(zustand + localStorage)
src/screens/              Title, Lobby, Briefing, Learn, Room, Debrief, Review, Host
src/puzzles/              WordBuilder, Diagnosis, Matching, OddOneOut, SpeedRound, Keypad
src/components/RoomScene  병동 SVG 장면(핫스팟)
```
