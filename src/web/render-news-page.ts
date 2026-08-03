import type { NewsPageModel, NewsViewItem, NewsViewQuery } from "./news-view-model.js";

const CATEGORY_LABELS: Record<string, string> = {
  model: "Model",
  coding_agent: "Coding agent",
  product: "Product",
  open_source: "Open source",
  benchmark: "Benchmark",
  infra: "Infrastructure",
  safety: "Safety",
  business: "Business",
  research: "Research"
};

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI",
  backend: "Backend",
  frontend: "Frontend",
  devops: "DevOps"
};

export function renderNewsPage(model: NewsPageModel, options: { basePath?: string } = {}): string {
  const basePath = options.basePath ?? "/news";
  const navigation = getDateNavigation(model.availableDates, model.selectedDate);
  const selectedDateLabel = model.selectedDate ?? "No digest yet";
  const resultLabel = model.totalCount === model.items.length
    ? `${model.items.length} signals`
    : `${model.items.length} of ${model.totalCount} signals`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(selectedDateLabel)} | AI Trend Agent</title>
  <style>${NEWS_PAGE_CSS}</style>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="${escapeAttribute(basePath)}" aria-label="AI Trend Agent latest news">
      <span class="brand-mark" aria-hidden="true">AT</span>
      <span>AI Trend Agent</span>
    </a>
    <span class="topbar-status"><span class="status-dot" aria-hidden="true"></span>LLM Wiki</span>
  </header>
  <main>
    <section class="masthead" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">Daily intelligence / Asia/Seoul</p>
        <h1 id="page-title">${escapeHtml(selectedDateLabel)}</h1>
        <p class="lede">검증된 기술 신호를 중요도와 신뢰도 순으로 정리한 일일 브리프입니다.</p>
      </div>
      <div class="date-nav" aria-label="Digest 날짜 이동">
        ${renderDateLink(navigation.previous, model.query, "이전", "←", basePath)}
        ${renderDateLink(navigation.next, model.query, "다음", "→", basePath)}
      </div>
    </section>

    <div class="workspace">
      <aside class="filters" aria-label="뉴스 검색 및 필터">
        <form action="${escapeAttribute(basePath)}" method="get">
          <div class="filter-heading">
            <h2>Explore</h2>
            <a href="${escapeAttribute(buildNewsUrl({ ...(model.selectedDate === null ? {} : { date: model.selectedDate }), q: "" }, basePath))}">초기화</a>
          </div>
          <label for="date">날짜</label>
          <select id="date" name="date">
            ${renderOptions(model.availableDates, model.selectedDate, "날짜 선택")}
          </select>
          <label for="q">검색</label>
          <input id="q" name="q" type="search" maxlength="120" value="${escapeAttribute(model.query.q)}" placeholder="제목, 요약, 태그">
          <label for="domain">도메인</label>
          <select id="domain" name="domain">
            ${renderOptions(model.filters.domains, model.query.domain, "전체 도메인", DOMAIN_LABELS)}
          </select>
          <label for="category">카테고리</label>
          <select id="category" name="category">
            ${renderOptions(model.filters.categories, model.query.category, "전체 카테고리", CATEGORY_LABELS)}
          </select>
          <label for="source">출처</label>
          <select id="source" name="source">
            ${renderOptions(model.filters.sources, model.query.source, "전체 출처")}
          </select>
          <button type="submit"><span aria-hidden="true">⌕</span> 적용</button>
        </form>
      </aside>

      <section class="feed" aria-labelledby="signals-title">
        <div class="feed-heading">
          <div>
            <p class="eyebrow">Ranked digest</p>
            <h2 id="signals-title">Top Signals</h2>
          </div>
          <div class="feed-meta">
            <strong>${escapeHtml(resultLabel)}</strong>
            ${model.digestGeneratedAt === null ? "" : `<span>Generated ${escapeHtml(formatDateTime(model.digestGeneratedAt))}</span>`}
          </div>
        </div>
        ${renderNewsItems(model)}
      </section>
    </div>
  </main>
</body>
</html>`;
}

export function buildNewsUrl(query: Partial<NewsViewQuery>, basePath = "/news"): string {
  const params = new URLSearchParams();
  if (query.date !== undefined) params.set("date", query.date);
  if (query.q !== undefined && query.q.length > 0) params.set("q", query.q);
  if (query.domain !== undefined) params.set("domain", query.domain);
  if (query.category !== undefined) params.set("category", query.category);
  if (query.source !== undefined) params.set("source", query.source);
  const suffix = params.toString();
  return suffix.length === 0 ? basePath : `${basePath}?${suffix}`;
}

function renderNewsItems(model: NewsPageModel): string {
  if (model.selectedDate === null) {
    return renderEmpty("아직 생성된 Digest가 없습니다", "수집과 랭킹이 완료되면 이곳에 첫 브리프가 표시됩니다.");
  }
  if (model.digestGeneratedAt === null) {
    return renderEmpty("해당 날짜의 Digest가 없습니다", "날짜 목록에서 저장된 다른 브리프를 선택해 주세요.");
  }
  if (model.items.length === 0) {
    return renderEmpty("조건에 맞는 신호가 없습니다", "검색어나 필터를 조정해 다시 확인해 주세요.");
  }
  return `<ol class="signal-list" role="list">${model.items.map(renderNewsItem).join("")}</ol>`;
}

function renderNewsItem(item: NewsViewItem, index: number): string {
  const rank = String(index + 1).padStart(2, "0");
  const category = item.trendCategory === null ? "Unassessed" : CATEGORY_LABELS[item.trendCategory] ?? item.trendCategory;
  const summary = item.summary ?? "아직 작성된 요약이 없습니다.";
  const sourceLink = getSafeHttpUrl(item.canonicalUrl);
  const tags = item.sourceTags.length === 0
    ? `<span class="tag muted">No source tags</span>`
    : item.sourceTags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");

  return `<li class="signal">
    <div class="rank" aria-label="Rank ${rank}">${rank}</div>
    <article>
      <div class="signal-kicker">
        <span class="domain domain-${escapeAttribute(item.domain)}">${escapeHtml(DOMAIN_LABELS[item.domain] ?? item.domain)}</span>
        <span>${escapeHtml(category)}</span>
        <span>${escapeHtml(item.sourceName)}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="summary">${escapeHtml(summary)}</p>
      ${item.whyItMatters === null ? "" : `<div class="analysis"><strong>Why it matters</strong><p>${escapeHtml(item.whyItMatters)}</p></div>`}
      ${item.practicalImpact === null ? "" : `<div class="analysis"><strong>Practical impact</strong><p>${escapeHtml(item.practicalImpact)}</p></div>`}
      <div class="tags" aria-label="Source tags">${tags}</div>
      <div class="signal-footer">
        <div class="scores">
          <span><small>Importance</small><strong>${formatScore(item.importanceScore)}</strong></span>
          <span><small>Confidence</small><strong>${formatConfidence(item.confidence)}</strong></span>
          <span><small>Status</small><strong>${escapeHtml(item.confirmationStatus ?? "unassessed")}</strong></span>
        </div>
        <div class="item-links">
          <code title="LLM Wiki stable ID">${escapeHtml(item.stableId)}</code>
          ${sourceLink === null ? `<span class="unavailable">원문 링크 없음</span>` : `<a href="${escapeAttribute(sourceLink)}" target="_blank" rel="noopener noreferrer">원문 <span aria-hidden="true">↗</span></a>`}
        </div>
      </div>
    </article>
  </li>`;
}

function renderEmpty(title: string, description: string): string {
  return `<div class="empty" role="status"><span aria-hidden="true">00</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>`;
}

function renderDateLink(
  date: string | null,
  query: NewsViewQuery,
  label: string,
  icon: string,
  basePath: string
): string {
  if (date === null) {
    return `<span class="nav-link disabled" aria-disabled="true">${label}</span>`;
  }
  const url = buildNewsUrl({ ...query, date }, basePath);
  const content = label === "이전" ? `${icon} ${label}` : `${label} ${icon}`;
  return `<a class="nav-link" href="${escapeAttribute(url)}" title="${escapeAttribute(date)} Digest">${content}</a>`;
}

function renderOptions(
  values: readonly string[],
  selected: string | null | undefined,
  emptyLabel: string,
  labels: Record<string, string> = {}
): string {
  const empty = `<option value="">${escapeHtml(emptyLabel)}</option>`;
  const options = selected === null || selected === undefined || values.includes(selected)
    ? values
    : [selected, ...values];
  return empty + options.map((value) => {
    const selectedAttribute = value === selected ? " selected" : "";
    return `<option value="${escapeAttribute(value)}"${selectedAttribute}>${escapeHtml(labels[value] ?? value)}</option>`;
  }).join("");
}

function getDateNavigation(availableDates: string[], selectedDate: string | null) {
  if (selectedDate === null) {
    return { previous: null, next: null };
  }
  const index = availableDates.indexOf(selectedDate);
  if (index < 0) {
    return { previous: null, next: null };
  }
  return {
    previous: availableDates[index + 1] ?? null,
    next: availableDates[index - 1] ?? null
  };
}

function getSafeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatScore(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value)}`;
}

function formatConfidence(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

const NEWS_PAGE_CSS = `
:root{color:#171a1f;background:#f3f5f4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-synthesis:none;letter-spacing:0;--ink:#171a1f;--muted:#66706b;--line:#d9dedb;--paper:#fff;--green:#156f4a;--orange:#c45a16;--yellow:#f1c84b}
*{box-sizing:border-box}body{margin:0;min-width:280px;background:#f3f5f4;color:var(--ink)}a{color:inherit}button,input,select{font:inherit;letter-spacing:0}.topbar{height:58px;padding:0 max(20px,calc((100vw - 1280px)/2));display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #252a27;background:#171a1f;color:#fff}.brand{display:flex;gap:10px;align-items:center;text-decoration:none;font-size:14px;font-weight:760}.brand-mark{display:grid;place-items:center;width:28px;height:28px;background:var(--yellow);color:#171a1f;font-size:11px;font-weight:900}.topbar-status{display:flex;align-items:center;gap:8px;color:#c8d0cc;font-size:12px}.status-dot{width:7px;height:7px;border-radius:50%;background:#55d18b}main{max-width:1280px;margin:0 auto;padding:0 20px 64px}.masthead{min-height:230px;padding:52px 0 34px;display:flex;align-items:flex-end;justify-content:space-between;gap:32px;border-bottom:1px solid #aeb7b2}.eyebrow{margin:0 0 11px;color:var(--green);font-size:11px;font-weight:800;text-transform:uppercase}.masthead h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:82px;font-weight:500;line-height:.94;letter-spacing:0}.lede{max-width:620px;margin:18px 0 0;color:#505954;font-size:15px;line-height:1.7}.date-nav{display:flex;gap:8px;flex-shrink:0}.nav-link{min-width:74px;height:38px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #9ca6a1;background:#fff;text-decoration:none;font-size:12px;font-weight:700}.nav-link:hover{border-color:var(--ink)}.nav-link.disabled{color:#a2aaa6;background:transparent}.workspace{display:grid;grid-template-columns:230px minmax(0,1fr);gap:48px;padding-top:36px}.filters{align-self:start;position:sticky;top:20px}.filter-heading{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px}.filter-heading h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:25px;font-weight:500}.filter-heading a{color:var(--muted);font-size:11px}.filters label{display:block;margin:17px 0 7px;color:#4e5752;font-size:11px;font-weight:750}.filters input,.filters select{width:100%;height:40px;border:1px solid #bdc5c0;border-radius:0;background:#fff;color:var(--ink);padding:0 10px;font-size:13px}.filters input:focus,.filters select:focus{outline:2px solid #70a98e;outline-offset:1px}.filters button{width:100%;height:42px;margin-top:20px;border:0;background:var(--ink);color:#fff;font-size:12px;font-weight:750;cursor:pointer}.filters button:hover{background:var(--green)}.feed{min-width:0}.feed-heading{min-height:76px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid var(--ink)}.feed-heading h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:30px;font-weight:500}.feed-meta{text-align:right}.feed-meta strong,.feed-meta span{display:block}.feed-meta strong{font-size:13px}.feed-meta span{margin-top:5px;color:var(--muted);font-size:10px}.signal-list{list-style:none;margin:0;padding:0}.signal{display:grid;grid-template-columns:58px minmax(0,1fr);gap:20px;padding:30px 0;border-bottom:1px solid var(--line)}.rank{font-family:Georgia,"Times New Roman",serif;font-size:24px;color:var(--orange)}.signal article{min-width:0}.signal-kicker{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#626b66;font-size:10px;font-weight:750;text-transform:uppercase}.signal-kicker span{min-width:0;max-width:100%;overflow-wrap:anywhere}.domain{padding:4px 7px;background:#dcebe3;color:#155f42}.domain-backend{background:#e8e2f0;color:#604878}.domain-frontend{background:#f6e5cf;color:#8a4b1d}.domain-devops{background:#dce5ef;color:#305675}.signal h3{overflow-wrap:anywhere;margin:12px 0 10px;font-family:Georgia,"Times New Roman",serif;font-size:26px;line-height:1.16;font-weight:500}.summary{overflow-wrap:anywhere;margin:0;color:#3f4743;font-size:14px;line-height:1.7}.analysis{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;margin-top:14px;padding-top:14px;border-top:1px solid #e4e8e5}.analysis strong{font-size:10px;text-transform:uppercase;color:var(--green)}.analysis p{overflow-wrap:anywhere;margin:0;color:#59615d;font-size:12px;line-height:1.6}.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}.tag{max-width:100%;overflow-wrap:anywhere;padding:4px 7px;border:1px solid #cbd2ce;color:#4a534e;font-size:10px}.tag.muted{color:#909793}.signal-footer{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-top:20px}.scores{display:flex;gap:18px;flex-wrap:wrap}.scores span{display:block}.scores small,.scores strong{display:block}.scores small{color:#7a837e;font-size:9px;text-transform:uppercase}.scores strong{margin-top:3px;font-size:12px}.item-links{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:13px;flex-wrap:wrap}.item-links code{max-width:310px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#68716c;font-size:10px}.item-links a{font-size:12px;font-weight:750;text-decoration:none;color:var(--green)}.unavailable{color:#929a96;font-size:11px}.empty{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-bottom:1px solid var(--line)}.empty span{font-family:Georgia,"Times New Roman",serif;color:#b5bdb9;font-size:44px}.empty h3{margin:12px 0 7px;font-family:Georgia,"Times New Roman",serif;font-size:24px;font-weight:500}.empty p{margin:0;color:var(--muted);font-size:13px}
@media(max-width:760px){.topbar{padding:0 16px}.topbar-status{display:none}main{padding:0 16px 40px}.masthead{min-height:210px;padding:38px 0 26px;display:block}.masthead h1{font-size:48px}.date-nav{margin-top:24px}.workspace{display:block;padding-top:24px}.filters{position:static;padding-bottom:28px;border-bottom:1px solid #aeb7b2}.filters form{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.filter-heading,.filters button{grid-column:1/-1}.filters label{margin-top:13px}.feed{padding-top:30px}.feed-heading{min-height:70px}.feed-meta span{display:none}.signal{grid-template-columns:36px minmax(0,1fr);gap:10px;padding:25px 0}.rank{font-size:18px}.signal h3{font-size:22px}.analysis{display:block}.analysis strong{display:block;margin-bottom:6px}.signal-footer{display:block}.item-links{justify-content:flex-start;margin-top:17px}.item-links code{max-width:100%}}
@media(max-width:390px){.filters form{display:block}.masthead h1{font-size:42px}.feed-heading h2{font-size:27px}.signal{grid-template-columns:30px minmax(0,1fr)}.scores{gap:12px}.nav-link{min-width:68px}}
`;
