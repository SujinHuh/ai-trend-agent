# Trusted AI Signal Watchlist

## 목적

공식 블로그만 보면 AI 흐름을 늦게 볼 수 있다. 이 문서는 X/Twitter, Threads, Reddit, Hacker News 같은 빠른 신호 채널을 어떻게 다룰지 정리한다.

Task 002에서는 이 목록을 enabled source로 쓰지 않는다. Task 007 social allow-list 또는 Task 003 `needs_confirmation` 보조 신호로만 사용한다.

## 원문 참고

- Karpathy LLM Wiki gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Andrej Karpathy X profile: https://x.com/karpathy
- Sam Altman X profile: https://x.com/sama
- Thomas Wolf X profile: https://x.com/Thom_Wolf
- Kimi / Moonshot X profile: https://x.com/Kimi_Moonshot
- Zhean Xu X profile: https://x.com/zheanxu
- Xiaokang Chen X profile: https://x.com/PKUCXK

## 신뢰도 정책

| Tier | Source kind | Digest 처리 |
| --- | --- | --- |
| A | 공식 vendor blog, official changelog, official GitHub release | `included` 후보 |
| B | 회사 공식 X/Threads 계정 | `needs_confirmation` 또는 공식 링크가 있으면 `included` 후보 |
| C | 유명 연구자, founder, maintainer, engineer | `needs_confirmation` |
| D | Reddit, HN, 커뮤니티 요약, newsletter | `needs_confirmation` |
| E | 익명 계정, 스크린샷, 출처 없는 루머 | 저장하지 않거나 별도 discard |

## X/Twitter 우선 Watch-List

아래 목록은 빠른 신호 감지를 위한 allow-list 후보이다. enabled source로 넣기 전에는 계정 소유, API 접근, 이용 약관, rate limit을 다시 확인한다.

### Verified From Current Research

| Handle | Person / org | Why watch | Default status |
| --- | --- | --- | --- |
| `@karpathy` | Andrej Karpathy | LLM, agent, education, AI tooling 흐름을 빠르게 정리하는 영향력 있는 개인 신호 | `needs_confirmation` |
| `@sama` | Sam Altman | OpenAI 방향, 제품/정책 신호 | `needs_confirmation` |
| `@Thom_Wolf` | Thomas Wolf | Hugging Face, open-source model ecosystem, research/tooling 신호 | `needs_confirmation` |
| `@Kimi_Moonshot` | Kimi / Moonshot AI | Kimi, Moonshot model/product 발표 신호 | `needs_confirmation` |
| `@zheanxu` | Zhean Xu | DeepSeek AI infra 관련 공개 신호 후보 | `needs_confirmation` |
| `@PKUCXK` | Xiaokang Chen | DeepSeek multimodal/research 관련 공개 신호 후보 | `needs_confirmation` |

### High-Priority Candidate Handles To Verify

| Candidate | Area | Why watch |
| --- | --- | --- |
| Andrej Karpathy | LLM education, agents, model intuition | 개인 LLM Wiki 원문 제공자이자 AI 개발자 여론 형성력이 큼. |
| Sam Altman | OpenAI | OpenAI 제품/정책 방향의 초기 신호. |
| Greg Brockman | OpenAI | OpenAI engineering/product signal 후보. |
| Ilya Sutskever | frontier model research | research 방향과 lab movement signal 후보. |
| Demis Hassabis | Google DeepMind | Gemini, DeepMind research/product direction 후보. |
| Jeff Dean | Google Research / DeepMind | Google AI infra/research signal 후보. |
| Dario Amodei | Anthropic | Claude, safety, policy direction 후보. |
| Daniela Amodei | Anthropic | Anthropic company/product direction 후보. |
| François Chollet | ARC, reasoning, Keras | reasoning benchmark와 AGI 논의 signal 후보. |
| Jim Fan | NVIDIA, embodied AI, agents | agent, robotics, simulation, NVIDIA AI signal 후보. |
| Yann LeCun | Meta AI | open model, world model, AI research debate signal 후보. |
| Joelle Pineau | Meta AI | Meta AI research leadership signal 후보. |
| Thomas Wolf | Hugging Face | open-source model/tooling ecosystem signal 후보. |
| Clement Delangue | Hugging Face | HF product, model hub, open-source ecosystem signal 후보. |
| Simon Willison | AI engineering | 실무 개발자 관점 LLM tooling/security signal 후보. |
| Harrison Chase | LangChain | agent framework, LangGraph, production agent signal 후보. |
| Jerry Liu | LlamaIndex | RAG, agent data layer, indexing signal 후보. |
| Hamel Husain | AI evals, applied LLM | LLM eval, applied engineering signal 후보. |
| Jeremy Howard | fast.ai, practical AI | practical AI and open-source model signal 후보. |
| Sebastian Raschka | ML education/research | model/research explanation signal 후보. |
| Ofir Press | LLM research | long context, architecture, research signal 후보. |
| Percy Liang | Stanford, HELM | evaluation, policy, research signal 후보. |
| Shital Shah | SWE-bench / agent eval ecosystem 후보 | coding-agent benchmark signal 후보. |
| Moonshot / Kimi maintainers | China model labs | Kimi/K-series 발표가 빠르게 움직이므로 별도 확인 필요. |
| DeepSeek researchers and maintainers | China model labs | open model, reasoning model, infra signal 후보. |
| Qwen researchers and maintainers | China model labs | Qwen coding/open-weight model signal 후보. |

## 수집 운영 방식

1. 매일 공식 source ingestion을 먼저 실행한다.
2. trusted individual/social 후보는 별도 collector나 수동 export로 수집한다.
3. social item은 기본적으로 `needs_confirmation`으로 저장한다.
4. 같은 주제가 공식 출처와 연결되면 confidence를 올린다.
5. 공식 확인이 없는 주장은 Slack digest 본문에 사실처럼 쓰지 않는다.
6. solo developer 관점에서 "당장 써볼 도구", "곧 확인할 모델", "관찰만 할 논쟁"으로 분류한다.
7. 반복적으로 유효한 신호를 주는 계정만 allow-list에 남긴다.

## Task 003 반영 기준

Task 003 ranking에서는 trusted individual signal을 아래처럼 쓴다.

- 공식 출처 + trusted individual 언급: priority boost 가능
- trusted individual 단독 언급: `needs_confirmation`, `watch_later`
- community 단독 언급: `needs_confirmation`, 낮은 confidence
- 여러 trusted individual이 같은 공식 링크를 언급: trend velocity signal
- 논쟁성 높은 claim: `contradictionNotes`에 기록하고 단정하지 않음
