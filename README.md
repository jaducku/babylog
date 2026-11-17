# 육아수첩 (babylog)

수유, 기저귀, 몸무게, 병원 기록을 가족이 함께 남기는 모바일 웹앱.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173 — 휴대폰은 같은 와이파이에서 --host 옵션으로
npm run build
```

첫 화면에서 **샘플 기록으로 먼저 둘러보기**를 누르면 생후 24일 아기의 3주치 기록이 채워진다.
같은 브라우저에서 탭을 두 개 열면 한쪽 기록이 다른 쪽에 바로 반영된다 (가족 공유 흉내).

## 구조

```
src/
  data/
    types.ts       도메인 타입 (supabase/schema.sql 과 1:1)
    store.ts       상태 + 액션. 지금은 localStorage, 나중에 Supabase로 교체
    vaccines.ts    국가예방접종 일정 (0~18개월)
    who.ts         WHO 체중 백분위
    sample.ts      샘플 데이터
  components/
    ui/            shadcn/ui 컴포넌트 (Radix 기반, 직접 소유하는 코드)
    record-sheet   모든 기록 입력·수정 시트 (어디서든 useRecordSheet()로 연다)
    feeding-banner 진행 중인 모유 수유 타이머
  pages/           오늘 · 성장 · 병원 · 가족 · 온보딩
supabase/schema.sql  가족 단위 RLS 포함 스키마 (연결 전 설계)
```

## 디자인 원칙

- **새벽 3시, 한 손, 3초.** 소변·대변은 버튼 한 번으로 기록하고 토스트에서 되돌린다. 모유는 누르는 즉시 타이머가 시작된다.
- **종이 수첩 톤.** 따뜻한 종이색 바탕, 잉크색 글자, 그림자 대신 얇은 괘선. 기록 종류마다 채도 낮은 색 하나 (수유 황토, 기저귀 올리브, 성장 청회색, 병원 벽돌).
- **누가 기록했는지 항상 보인다.** 타임라인 오른쪽의 엄마/아빠 배지.
- **밤에는 어둡게.** 시스템 설정을 따르고, 가족 탭에서 고정할 수 있다.

## Supabase 연결 계획

1. `supabase/schema.sql` 실행
2. 인증: 이메일 매직링크 또는 카카오 OAuth
3. `src/data/store.ts`의 `actions`가 Supabase를 호출하도록 바꾸고, `records`·`active_feedings` Realtime 구독으로 들어온 변경을 상태에 반영 (화면 컴포넌트는 그대로)
4. 오프라인일 때는 지금의 localStorage를 큐로 쓰고 온라인이 되면 밀어넣기
5. `invites` 테이블로 초대 링크

## shadcn/ui

`components.json`이 설정되어 있어 `npx shadcn@latest add <컴포넌트>`로 추가할 수 있다.
