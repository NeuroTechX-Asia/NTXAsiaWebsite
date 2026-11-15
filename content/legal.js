/**
 * Legal copy for the regional site.
 *
 * The structure follows the NeuroTechX Network Privacy Policy
 * (https://neurotechx.com/privacy-policy/, last updated October 2020) — the
 * global policy remains the basis for the whole network. These pages describe
 * how the NeuroTechX Asia - China regional site applies it, and they state only
 * what this codebase actually does: no analytics, no advertising cookies, two
 * functional localStorage keys, contact delivery through Resend.
 */

export const LEGAL = {
  privacy: {
    updated: "2026-11-14",
    title: { zh: "隐私政策", en: "Privacy Policy" },
    lead: {
      zh: "本页说明 NeuroTechX Asia - China 区域站点如何处理你的个人数据。全球网络层面的政策由 NeuroTechX 统一制定，本页是该政策在本区域的落地说明。",
      en: "This page explains how the NeuroTechX Asia - China regional site handles your personal data. The network-wide policy is set by NeuroTechX globally; this page describes how it applies in this region.",
    },
    sections: [
      {
        id: "who",
        h: { zh: "我们是谁", en: "Who we are" },
        p: [
          {
            zh: "NeuroTechX Asia - China 是 NeuroTechX 全球神经科技社群在亚洲的区域共同体，由志愿者运营，覆盖大中华区以及香港、上海、东京和印度等城市分会所在的亚洲网络。",
            en: "NeuroTechX Asia - China is the Asian regional community of the global NeuroTechX neurotechnology network. It is run by volunteers and covers Greater China along with the wider Asian chapter network (Hong Kong, Shanghai, Tokyo and the Indian chapters).",
          },
          {
            zh: "全球网络由 NeuroTechX（Société BCI Montréal，以 NeuroTechX 名义运营）管理。其《Network Privacy Policy》是整个网络的共同基础，你可以访问 https://neurotechx.com/privacy-policy/ 阅读原文。本页仅说明本站的具体做法。",
            en: "The global network is operated by NeuroTechX (Société BCI Montréal, d.b.a. NeuroTechX). Its Network Privacy Policy is the common basis for every chapter and is available at https://neurotechx.com/privacy-policy/. This page only describes the practices specific to this site.",
          },
        ],
      },
      {
        id: "scope",
        h: { zh: "本政策适用范围", en: "Where this policy applies" },
        p: [
          {
            zh: "适用于你浏览本站、通过“加入社群”表单联系我们、报名参加活动或订阅社群更新时产生的个人数据。",
            en: "It applies to personal data created when you browse this site, contact us through the join-community form, register for an event, or subscribe to community updates.",
          },
          {
            zh: "不适用于第三方平台上的活动，例如 Eventbrite 报名页、YouTube 频道、Slack 社群或微信，这些平台适用其各自的隐私政策。",
            en: "It does not cover activity on third-party platforms — Eventbrite registration pages, the YouTube channel, Slack or WeChat — which are governed by their own privacy policies.",
          },
        ],
      },
      {
        id: "collect",
        h: { zh: "我们收集哪些数据", en: "What we collect" },
        p: [
          {
            zh: "联系表单：姓名、邮箱、留言内容，以及你选择填写的城市或机构。这些数据只发送到我们的收件箱，不会保存在本站数据库里，因为本站没有访客数据库。",
            en: "Contact form: name, email address, your message, and optionally your city or organisation. This is delivered to our inbox; the site keeps no visitor database.",
          },
          {
            zh: "站点偏好：语言（中文/English）与深浅主题，只保存在你浏览器的 localStorage 中，不会上传到任何服务器。",
            en: "Site preferences: language (中文/English) and dark or light theme. These live only in your browser's localStorage and are never uploaded.",
          },
          {
            zh: "服务器日志：托管服务商 Vercel 记录 IP 地址、时间与请求路径，用于安全和故障排查。",
            en: "Server logs: our host Vercel records IP address, timestamps and request paths for security and debugging.",
          },
          {
            zh: "我们不使用广告 Cookie，不建立访客画像，也不接入 Google Analytics。",
            en: "We use no advertising cookies, build no visitor profiles and run no Google Analytics.",
          },
        ],
      },
      {
        id: "why",
        h: { zh: "收集目的", en: "Why we process it" },
        p: [
          {
            zh: "回复你的咨询、组织活动与城市分会、在你同意的前提下发送社群更新（可随时退订），以及以聚合方式了解站点使用情况。法律依据为你的同意、履行你请求的服务，以及社群的正当利益。",
            en: "To answer your enquiry, organise events and city chapters, send community updates when you have agreed (you can unsubscribe at any time), and understand site usage in aggregate. The legal bases are your consent, performing the service you asked for, and the community's legitimate interests.",
          },
        ],
      },
      {
        id: "cookies",
        h: { zh: "Cookie 与本地存储", en: "Cookies and local storage" },
        p: [
          {
            zh: "本站只写入两项功能性本地存储：ntx-lang（语言）与 ntx-theme（深浅主题）。它们只存在于你的设备上，不会随请求发送给服务器，也没有跨站跟踪用途。",
            en: "The site writes exactly two functional localStorage keys: ntx-lang (language) and ntx-theme (theme). They stay on your device, are not sent with requests and are not used for cross-site tracking.",
          },
          {
            zh: "你可以随时在浏览器设置中清除这些数据，站点会回到默认的中文界面与深色主题。",
            en: "You can clear them in your browser at any time; the site then returns to its default Chinese interface and dark theme.",
          },
        ],
      },
      {
        id: "share",
        h: { zh: "我们与谁共享数据", en: "Who we share it with" },
        p: [
          {
            zh: "我们不出售、不出租、不交换你的个人数据。只在以下情形共享：托管服务商 Vercel（运行本站）、邮件发送服务商 Resend（仅在你通过表单联系我们时传递邮件内容），以及法律要求时向主管机关提供。",
            en: "We do not sell, rent or trade personal data. We share it only with our host Vercel (to serve the site), with Resend (to deliver your message when you use the contact form), and with authorities when the law requires it.",
          },
        ],
      },
      {
        id: "retention",
        h: { zh: "保存期限", en: "How long we keep it" },
        p: [
          {
            zh: "联系表单邮件：处理完你的咨询后最多保留 24 个月。活动报名信息：活动结束后 12 个月。服务器日志：按托管服务商的默认策略保留。",
            en: "Contact emails: kept at most 24 months after your enquiry is resolved. Event registrations: 12 months after the event. Server logs: kept according to the host's default policy.",
          },
        ],
      },
      {
        id: "rights",
        h: { zh: "你的权利", en: "Your rights" },
        p: [
          {
            zh: "你可以要求查阅、更正、删除你的个人数据，撤回同意，或限制处理。适用 GDPR 时，你还有权反对处理、要求数据可携；适用《中华人民共和国个人信息保护法》时，你享有查阅、复制、更正与删除的权利。",
            en: "You can ask to access, correct or delete your personal data, withdraw consent, or restrict processing. Under the GDPR you may also object to processing and request portability; under the PRC Personal Information Protection Law you may access, copy, correct and delete your data.",
          },
          {
            zh: "请通过本站的“加入社群”按钮提交请求，我们会在 30 天内回复。如果我们无法满足某项请求，会说明原因。如对结果不满意，你可以向所在地的数据保护机构投诉。",
            en: "Send your request through the join-community button on this site; we answer within 30 days. If we cannot act on a request we explain why. If you are not satisfied, you can complain to your local data protection authority.",
          },
        ],
      },
      {
        id: "security",
        h: { zh: "安全", en: "Security" },
        p: [
          {
            zh: "本站通过 HTTPS 提供，联系邮箱只保存在服务器端环境变量中、从不下发到浏览器，联系接口带速率限制。但任何网络传输与存储都无法保证绝对安全，请不要在留言中发送密码或敏感身份信息。",
            en: "The site is served over HTTPS, the contact mailbox lives only in a server-side environment variable and is never sent to the browser, and the contact endpoint is rate-limited. No transmission or storage is absolutely secure, so please do not put passwords or sensitive identity documents in a message.",
          },
        ],
      },
      {
        id: "minors",
        h: { zh: "未成年人", en: "Minors" },
        p: [
          {
            zh: "本站面向成年人社群，不主动收集 16 岁以下用户的个人数据。如果你是家长或监护人并认为我们持有此类数据，请通过表单联系我们删除。",
            en: "This site addresses an adult professional community and does not knowingly collect data from anyone under 16. If you are a parent or guardian and believe we hold such data, contact us and we will delete it.",
          },
        ],
      },
      {
        id: "changes",
        h: { zh: "政策变更", en: "Changes to this policy" },
        p: [
          {
            zh: "本页顶部的更新日期会随每次修改而变化。发生重大变更时，我们会在站内公告。",
            en: "The update date at the top of this page changes with every revision. Material changes are announced on the site.",
          },
        ],
      },
      {
        id: "contact",
        h: { zh: "联系我们", en: "Contact us" },
        p: [
          {
            zh: "通过本站首页的“加入社群 / 联系我们”按钮提交表单即可，这是我们唯一公开的隐私事务联系方式。",
            en: "Use the join-community / contact button on the home page — it is the only published route for privacy requests.",
          },
        ],
      },
    ],
  },

  terms: {
    updated: "2026-11-14",
    title: { zh: "条款与条件", en: "Terms & Conditions" },
    lead: {
      zh: "使用本站在法律上意味着你接受以下条款。它们写得很短，因为我们希望它们真的被读完。",
      en: "Using this site means you accept the terms below. They are short on purpose — we would rather they be read.",
    },
    sections: [
      {
        id: "what",
        h: { zh: "本站是什么", en: "What this site is" },
        p: [
          {
            zh: "NeuroTechX Asia - China 的区域站点：介绍亚洲的神经科技社群、城市分会，整理大中华区的机构目录，发布活动与播客内容。本站由志愿者维护，不是商业服务，也不收取任何费用。",
            en: "The regional site of NeuroTechX Asia - China: it introduces the Asian neurotechnology community and city chapters, maintains a directory of institutions across Greater China, and publishes events and podcast material. It is volunteer-run, not a commercial service, and free to use.",
          },
        ],
      },
      {
        id: "directory",
        h: { zh: "目录与信息来源", en: "The directory and its sources" },
        p: [
          {
            zh: "机构条目来自公开资料（机构官网、政府公告、公开报道）。每条记录标注核验状态：实心点为已核验，琥珀点为部分核验（例如官网拒绝自动访问）。我们尽力保持准确，但不保证信息完整或时效。",
            en: "Institution entries are compiled from public sources (official sites, government notices, public reporting). Each record carries a verification state: a solid dot means verified, an amber dot means partially verified (for example when a site blocks automated reads). We try hard to be accurate but cannot guarantee completeness or currency.",
          },
          {
            zh: "发现错误请联系我们更正：目录的用途是提供可核查的线索，而不是发布权威评价。",
            en: "If you find an error, tell us and we will correct it. The directory exists to give checkable leads, not to publish authoritative rankings.",
          },
        ],
      },
      {
        id: "no-advice",
        h: { zh: "非医疗与专业建议", en: "No medical or professional advice" },
        p: [
          {
            zh: "本站内容（包括机构介绍、研究方向和活动信息）仅供社群交流参考，不构成医疗、诊断、投资或法律建议。涉及治疗与临床决定，请咨询有资质的专业人员。",
            en: "Everything here — institution descriptions, research fields, event listings — is community information. It is not medical, diagnostic, investment or legal advice. For treatment and clinical decisions, consult a qualified professional.",
          },
        ],
      },
      {
        id: "conduct",
        h: { zh: "社群行为", en: "Community conduct" },
        p: [
          {
            zh: "在参与本站组织的活动与社群时，请保持尊重：不歧视、不骚扰、不发布垃圾信息，不冒充他人或机构。我们保留拒绝或移除违反这些原则的参与者的权利。",
            en: "When you take part in events and community spaces we run, be respectful: no discrimination, harassment, spam, or impersonation of people and institutions. We may decline or remove participation that breaks these rules.",
          },
        ],
      },
      {
        id: "ip",
        h: { zh: "知识产权", en: "Intellectual property" },
        p: [
          {
            zh: "NeuroTechX 名称与标志归 NeuroTechX 所有，本站经授权在区域内使用。第三方机构的名称、标志与商标归其各自所有者，本站仅为识别与介绍而引用。本站原创内容可在注明出处的前提下用于非商业的社群用途；商业使用请先联系我们。",
            en: "The NeuroTechX name and marks belong to NeuroTechX and are used here under the regional community mandate. Third-party names, logos and trademarks belong to their owners and are referenced only for identification. Original material on this site may be reused for non-commercial community purposes with attribution; ask us first for commercial use.",
          },
        ],
      },
      {
        id: "links",
        h: { zh: "外部链接", en: "External links" },
        p: [
          {
            zh: "本站链接到机构官网、活动平台与播客服务，这些站点由第三方运营，其内容与隐私做法不由我们负责。",
            en: "This site links to institution websites, event platforms and podcast services. They are run by third parties; we are not responsible for their content or their privacy practices.",
          },
        ],
      },
      {
        id: "liability",
        h: { zh: "责任限制", en: "Limitation of liability" },
        p: [
          {
            zh: "本站按“现状”提供。我们尽力保证可用与准确，但不对因使用本站信息而产生的间接损失承担责任。若你不接受这些条款，请停止使用本站。",
            en: "The site is provided as is. We work to keep it available and accurate but accept no liability for indirect loss arising from use of the information published here. If you do not accept these terms, please stop using the site.",
          },
        ],
      },
      {
        id: "changes",
        h: { zh: "条款变更与联系", en: "Changes and contact" },
        p: [
          {
            zh: "条款可能随站点发展更新，更新日期见页面顶部。问题与更正请通过首页的“加入社群 / 联系我们”按钮提交。",
            en: "These terms may change as the site develops; the update date is at the top of this page. Questions and corrections go through the join-community / contact button on the home page.",
          },
        ],
      },
    ],
  },
};
