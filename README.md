# 普拉提健康测评 (Pilates Health Quiz)

[![CI](https://github.com/Zhejian-Zheng/pilates-health-quiz/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Zhejian-Zheng/pilates-health-quiz/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://pilates-health-quiz-f4kpp6lnj-zhejians-projects.vercel.app/)

一个 Next.js 全栈健康测评转化链路项目，包含账号登录、游客测评、分步答案持久化、进度恢复、服务端健康结果计算、订阅状态控制和模拟支付解锁。

项目当前更偏工程原型：重点是数据流、API 边界校验、账号/session 绑定、支付幂等和自动化测试。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7
- Supabase PostgreSQL
- Zod
- Vitest
- Tailwind CSS

## 本地快速开始

建议使用 Node.js 20 或更高版本。

```bash
npm install
cp .env.example .env
```

编辑 `.env`，至少配置：

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_COOKIE_SECRET="replace-with-a-long-random-secret"
PAY_WEBHOOK_SECRET="replace-with-a-shared-webhook-secret"
```

如果使用远程 Supabase 或已有数据库，执行：

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

如果是本地开发数据库，也可以使用：

```bash
npx prisma migrate dev
npm run dev
```

应用默认运行在：

```text
http://localhost:3000
```

国内网络如果 `npm install` 较慢，可以临时使用 npm 镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 环境变量

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_COOKIE_SECRET="replace-with-a-long-random-secret"
PAY_WEBHOOK_SECRET="replace-with-a-shared-webhook-secret"
```

说明：

- `DATABASE_URL`：服务端 PostgreSQL 连接字符串，不能暴露到前端。
- `AUTH_COOKIE_SECRET`：用于签名账号登录 cookie。生产环境必须使用足够长的随机字符串。
- `PAY_WEBHOOK_SECRET`：用于验证 `/pay` 的 Webhook 签名。纯本地模拟支付可以省略，生产环境建议配置。

## 用户流程

应用首页就是测评入口。

1. 用户可以注册、登录，或以游客模式继续。
2. 游客/用户回答健康测评问题。
3. 每一步答案都会保存到后端 session。
4. 刷新浏览器时，后端会通过 httpOnly cookie 恢复当前 session。
5. 完成测评后，服务端计算并保存健康结果。
6. 非会员只能看到锁定预览，包括 BMI、分类和基础总结。
7. 游客在结果页点击“登录后进行下一步”会弹出登录/注册弹窗。弹窗中不再显示“游客继续”。
8. 游客注册后，当前游客 session 会升级绑定到新账号，不会丢失刚完成的测评结果。
9. 登录/注册后仍然不会自动解锁完整计划，用户需要继续点击“解锁完整计划”触发模拟支付。
10. 模拟支付成功后，订阅状态变为 `ACTIVE`，完整结果解锁。

## 账号与认证

账号功能由自定义 API 实现，没有使用 NextAuth。

相关接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

认证实现：

- `User.email` 唯一。
- 密码不会明文保存，服务端使用 Node.js `crypto.scrypt` 加盐哈希，写入 `User.passwordHash`。
- 登录成功后写入 httpOnly 的账号 cookie：`pilates_health_quiz_account`。
- 测评进度使用独立 httpOnly session cookie：`pilates_health_quiz_session`。
- 游客注册时，如果当前浏览器已有游客 session，会直接把这个游客 `User` 升级为账号用户。

注册请求示例：

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Kevin",
    "email": "kevin@example.com",
    "password": "123456"
  }'
```

登录请求示例：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kevin@example.com",
    "password": "123456"
  }'
```

退出登录：

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## Session 与测评 API

创建测评 session：

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"flowId":"2117"}'
```

增量保存答案：

```bash
curl -X PATCH http://localhost:3000/api/sessions/{sessionId}/answers \
  -H "Content-Type: application/json" \
  -d '{
    "currentStep": 1,
    "answers": [
      {"stepKey":"ageRange","questionKey":"ageRange","value":"30-39"}
    ]
  }'
```

API 会拒绝：

- 跳过未完成步骤
- 倒退 `currentStep`
- 未知题目 key
- 不支持的枚举值
- 超出合理范围的数值
- 已完成测评后的答案更新

### API 路径设计与校验说明

API 路径按资源职责拆分，避免把测评、结果、账号和支付逻辑混在一个接口里：

- `POST /api/sessions`：创建测评 session。
- `GET /api/sessions/current`：通过 httpOnly cookie 恢复当前浏览器的测评进度。
- `GET /api/sessions/{sessionId}`：读取指定 session 进度。
- `PATCH /api/sessions/{sessionId}/answers`：增量保存答案。
- `POST /api/sessions/{sessionId}/complete`：完成测评，服务端生成健康结果。
- `GET /api/results/current`：读取当前浏览器 session 的结果。
- `GET /api/results/{sessionId}`：读取指定 session 的结果。
- `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`：账号注册、登录、退出。
- `POST /pay`：模拟支付回调；`POST /api/pay` 保留兼容。

数据验证不是只依赖前端，而是在服务端分三层处理：

- 请求结构层：Zod 校验 body 结构、字段长度、数组长度、整数范围和 JSON 合法性。
- 业务值域层：对身高、体重、年龄、枚举题做白名单和上下限校验。
- 流程状态层：校验是否跳题、倒退、提交未知题目、已完成后继续修改。

因此，即使攻击者绕过前端直接请求 API，接口也会拒绝非法值、越界值和乱序流程。

### 非法数值注入与越界输入防护

答案保存接口 `PATCH /api/sessions/{sessionId}/answers` 会先经过 Zod schema 和业务值校验，再写入数据库。

防护点：

- `value` 必须是合法 JSON 值，拒绝 `NaN`、`Infinity` 等非有限数字。
- 身高 `heightCm` 必须是数字，并限制在 `100-250`。
- 当前体重 `currentWeightKg` 和目标体重 `targetWeightKg` 必须是数字，并限制在 `30-300`。
- 年龄 `age` 必须是整数，并限制在 `13-100`。
- 数字字段拒绝字符串注入，例如 `"165; DROP TABLE"`。
- 数字字段拒绝对象或数组注入，例如 `{ "kg": 80 }`、`[70]`。
- 枚举字段只接受白名单值。

相关实现：

- `src/lib/schemas.ts`：`saveAnswersSchema`、`validateAnswerValues`、`assertNumberInRange`、`assertIntegerInRange`
- `src/app/api/sessions/[sessionId]/answers/route.ts`：在持久化前调用校验，失败返回 `400` 或 `422`

相关测试覆盖：

- `tests/schemas.test.ts`：覆盖越界值、非数字注入、`NaN` 等 schema/业务校验
- `tests/api-flow.test.ts`：覆盖接口边界上的越界保存和数字注入请求
- `tests/health-assessment.test.ts`：覆盖服务端健康计算阶段的非有限数字和不合理健康数据

恢复当前浏览器 session：

```bash
curl http://localhost:3000/api/sessions/current
```

通过 sessionId 获取进度：

```bash
curl http://localhost:3000/api/sessions/{sessionId}
```

完成测评并计算结果：

```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/complete
```

获取当前浏览器结果：

```bash
curl http://localhost:3000/api/results/current
```

通过 sessionId 获取结果：

```bash
curl http://localhost:3000/api/results/{sessionId}
```

## 订阅与模拟支付

本项目有一个模拟支付接口 `/pay`，不会收取真实费用。旧路径 `/api/pay` 仍保留兼容。

未付费时，结果接口返回：

- `access: "LOCKED"`
- `subscriptionStatus`
- BMI
- BMI 分类
- 基础总结
- `paywall.protectedFields`

受保护字段不会出现在非会员响应中：

- `recommendedCalories`
- `targetDate`
- `detailedRecommendation`
- `projectionCurve`

锁定响应示例：

```json
{
  "sessionId": "demo-session-id",
  "subscriptionStatus": "INACTIVE",
  "access": "LOCKED",
  "result": {
    "bmi": 24.6,
    "bmiCategory": "Healthy",
    "summary": "Your BMI is in the healthy range.",
    "paywall": {
      "message": "Upgrade to unlock your full Pilates plan.",
      "protectedFields": [
        "recommendedCalories",
        "targetDate",
        "detailedRecommendation",
        "projectionCurve"
      ]
    }
  }
}
```

模拟支付回调：

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "providerEventId": "evt_demo_001",
    "payload": {
      "source": "readme-demo"
    }
  }'
```

支付成功后：

- 写入 `PaymentEvent`
- `Subscription.status` 更新为 `ACTIVE`
- 同一个结果接口返回 `access: "FULL"`
- 完整结果包含推荐热量、目标日期、详细建议和预测曲线

生产环境中，`/pay` 应替换为真实支付服务商 webhook，例如 Stripe 或 Paddle。真实 webhook 必须校验签名、金额、货币和事件 ID，并保证幂等。

带签名的支付请求示例：

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "x-pay-signature: SIGNATURE_HEX" \
  -d '{"sessionId":"{sessionId}","providerEventId":"evt_123","payload":{"mock":true}}'
```

生成一个已支付的演示 session：

```bash
APP_URL=http://localhost:3000 npm run demo:paid-session
```

部署后使用线上地址：

```bash
APP_URL=https://your-deployed-app.vercel.app npm run demo:paid-session
```

## 数据库结构

当前 Prisma schema 已升级为生产级 CRM/健康 SaaS 结构：既保留测评、账号、支付的核心闭环，也预留组织租户、员工权限、CRM 跟进、题库版本、同意记录和审计日志。

```mermaid
erDiagram
  Organization ||--o{ OrganizationMembership : has
  Organization ||--o{ CrmLead : owns
  Organization ||--o{ AuditLog : scopes
  User ||--o{ OrganizationMembership : joins
  User ||--o{ AssessmentSession : takes
  User ||--o| UserProfile : extends
  User ||--o{ AuthSession : logs_in
  User ||--o| Subscription : owns
  User ||--o{ ConsentRecord : grants
  User ||--o{ PaymentEvent : pays
  User ||--o{ CrmLead : becomes
  User ||--o{ CrmLead : owns
  AssessmentFlow ||--o{ AssessmentQuestion : defines
  AssessmentQuestion ||--o{ AssessmentQuestionOption : offers
  AssessmentQuestion ||--o{ AssessmentAnswer : receives
  AssessmentSession ||--o{ AssessmentAnswer : stores
  AssessmentSession ||--o| HealthProfile : extracts
  AssessmentSession ||--o| AssessmentResult : calculates
  Plan ||--o{ Subscription : prices
  CrmLead ||--o{ CrmNote : records
  CrmLead ||--o{ CommunicationEvent : contacts
```

核心表分层：

- 账号与权限：`User`、`UserProfile`、`AuthSession`、`Organization`、`OrganizationMembership`
- 测评内容与作答：`AssessmentFlow`、`AssessmentQuestion`、`AssessmentQuestionOption`、`AssessmentSession`、`AssessmentAnswer`
- 健康结果：`HealthProfile`、`AssessmentResult`
- 商业化：`Plan`、`Subscription`、`PaymentEvent`
- CRM：`CrmLead`、`CrmNote`、`CommunicationEvent`
- 合规与运维：`ConsentRecord`、`AuditLog`

关键约束与设计取舍：

- `User.email` 唯一，用于账号登录；`User.sessionId` 唯一，用于兼容当前游客 session 恢复。
- `User.passwordHash` 只保存哈希，不保存明文密码。
- `OrganizationMembership` 对 `(organizationId, userId)` 唯一，支持一个用户加入多个组织并拥有不同角色。
- `AssessmentFlow` 使用 `slug + version` 唯一约束，题库可版本化发布，历史测评结果不会因为改题而失真。
- `AssessmentAnswer` 对 `(assessmentId, questionKey)` 唯一，重复提交会更新原答案，不会产生脏重复行。
- `Subscription.status` 使用枚举：`INACTIVE`、`TRIALING`、`ACTIVE`、`PAST_DUE`、`CANCELED`、`EXPIRED`。
- `PaymentEvent.providerEventId` 唯一，用于支付 webhook 幂等，避免重复回调重复开通会员。
- `CrmLead.stage`、`CommunicationEvent.status`、`ConsentRecord.type`、`AuditLog` 都有索引，方便后台筛选、跟进、合规追踪。
- 健康和 CRM 中变化快、结构可能扩展的字段使用 `Json`，例如 `medicalNotes`、`riskFlags`、`features`、`metadata`，避免每次产品实验都迁移表结构。
- 用户删除使用 `deletedAt` 软删除字段，审计、支付、测评历史仍可保留。

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm test
npx tsc --noEmit
npx prisma generate
npx prisma migrate deploy
```

## 测试

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

测试覆盖：

- 健康评估算法和 BMI 分类边界
- 卡路里和目标日期预测
- 输入范围校验和非法数据拦截
- 答案保存状态机：跳题、乱序、倒退、未知 key
- 重复答案更新和并发 PATCH
- 已完成测评禁止继续修改答案
- 非会员结果字段保护
- 模拟支付、Webhook 签名和幂等
- 账号密码哈希、账号 cookie 签名和 auth schema

当配置了 `DATABASE_URL` 时，依赖数据库的集成测试会运行。CI 中会启动 PostgreSQL 服务并执行 migration。本地如果连的是 Supabase 远程库，注意测试会写入数据。

## 持续集成

GitHub Actions 配置位于 `.github/workflows/ci.yml`，主要步骤：

- `npm ci`
- `npx prisma migrate deploy`
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`

## 质量说明

- 受保护结果字段只由服务端订阅状态决定，前端状态无法绕过。
- 密码只保存 scrypt 哈希，不保存明文。
- 账号 cookie 为 httpOnly，并带 HMAC 签名。
- 健康计算只在服务端执行，结果会持久化。
- 答案保存使用 `upsert`，同一题不会生成重复答案行。
- 支付事件通过 `providerEventId` 做幂等控制，避免重复支付回调造成重复状态变更。

## 部署清单

1. 创建 PostgreSQL/Supabase 数据库。
2. 配置生产环境变量：`DATABASE_URL`、`AUTH_COOKIE_SECRET`、`PAY_WEBHOOK_SECRET`。
3. 发布前执行：

```bash
npx prisma migrate deploy
npm run build
```

4. 部署到 Vercel 或其他 Node.js 托管平台。
5. 访问线上地址，完整跑通：

```text
注册/游客进入 -> 完成测评 -> 看到锁定结果 -> 登录/注册 -> 点击解锁 -> 看到完整结果
```

6. 如需提交演示数据，生成已付费 session：

```bash
APP_URL=https://your-deployed-app npm run demo:paid-session
```

## AI 协作说明

本项目开发中使用 AI 辅助梳理数据库结构、API 边界、异常场景和测试用例。所有关键实现都经过人工审查，并通过类型检查、lint、测试和 build 验证。

曾评估过 Prisma interactive transaction，但在 Supabase 连接池场景中容易出现 `P2028` 事务启动超时。因此当前实现更偏向 Prisma nested write、显式 `upsert` 和短事务，以提高稳定性。
