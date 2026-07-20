# Architecture

## 1. Task 001 기술 선택

Task 001의 기본 런타임과 언어는 다음으로 정한다.

- Runtime: Node.js
- Language: TypeScript
- Package manager: npm

## 2. 선택 이유

Node.js + TypeScript는 AI Trend Agent의 초기 요구에 잘 맞는다.

주요 이유:

- RSS, Atom, HTML parsing, Markdown generation, CLI 구현에 필요한 npm 생태계가 풍부하다.
- Source Registry, Article, Report 같은 JSON 중심 데이터를 TypeScript 타입으로 안전하게 다룰 수 있다.
- 로컬 CLI와 Cloud Run 배포 흐름을 같은 언어로 유지할 수 있다.
- Google Cloud Run이 Node.js 런타임을 공식 지원한다.
- 이후 Notion, Gmail/SendGrid, OpenAI, Anthropic API 연동도 Node.js SDK 또는 HTTP client로 처리하기 쉽다.

## 3. 대안 비교

### Python

장점:

- AI, 데이터 처리, 스크래핑, 텍스트 처리 생태계가 강하다.
- 빠른 프로토타이핑에 좋다.

단점:

- TypeScript보다 JSON 스키마와 애플리케이션 타입 계약을 엄격하게 유지하려면 추가 도구가 필요하다.
- 이 프로젝트의 초기 핵심은 모델 학습이나 데이터 분석이 아니라 API/수집/리포트 자동화다.

### Java 또는 Kotlin

장점:

- 백엔드 운영 안정성과 타입 안정성이 좋다.
- 사용자의 백엔드 업무 맥락과 잘 맞는다.

단점:

- Task 001 같은 수집 CLI와 빠른 실험에는 초기 설정이 상대적으로 무겁다.
- RSS/HTML 파싱, Markdown 생성, API 자동화 반복 개발 속도는 Node.js/TypeScript가 더 가볍다.

### Go

장점:

- 단일 바이너리 배포, 빠른 실행, 운영 안정성이 좋다.

단점:

- LLM/Notion/TTS 같은 외부 API 연동과 리포트 포맷 반복 수정은 TypeScript 쪽이 더 빠르게 개발하기 쉽다.

## 4. 결론

Task 001과 MVP 초반은 Node.js + TypeScript가 적합하다.

이 선택은 "최근 많이 쓰여서"만이 아니라, 다음 조건을 동시에 만족하기 때문이다.

- 로컬 CLI 개발 속도
- 수집/파싱/npm 생태계
- JSON 스키마와 타입 안정성
- Cloud Run 배포 적합성
- 이후 외부 API 연동 확장성

단, 장기적으로 대규모 데이터 분석이나 ML 처리가 핵심이 되면 Python worker를 별도 서비스로 분리할 수 있다.

