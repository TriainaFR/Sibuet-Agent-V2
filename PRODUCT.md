# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The marketing team of Maisons & Hôtels Sibuet, which opens the tool every Monday on a laptop to decide what to launch that week. Allin Conseil and Triaina also present it to the client on a large screen in meetings. The pilot hotel is Lodge Park (Megève).

## Product Purpose

Agent Sibuet detects multichannel marketing opportunities: what to talk about, when, to which market and through which levers (newsletter and CRM, SEO, Google Ads, Meta, agencies, snow trigger). It turns real data (Asterio sales, Search Console, GA4, Semrush, the Megève events calendar, school holidays, snow) into dated actions that the team validates. Success means the week's three priorities are decided in a few minutes, each one tied to a market and backed by a sourced number.

## Positioning

The market is the primary axis: each market's buying calendar, delay, peak month and sales channel are measured from the hotel's own sales, with groups kept apart, and an action is proposed only inside that market's purchase window. Nothing is sent without human validation.

## Operating Context

- Weekly routine on Mondays.
- Demonstration mode: winter 2025-26 replayed at 16 Oct 2025 with real Asterio sales, behind a permanent banner saying so.
- Briefs are produced per validated action.
- A printable weekly plan is exported as a PDF.
- Access is behind a login, and the hosting is on Railway.

## Capabilities and Constraints

- Next.js 16, React 19, Tailwind 4, data stored as JSON through a `Depot` interface, pure calculation engine.
- French only.
- Writing rules:
  - Short sentences.
  - No em dash.
  - Words rather than indices.
  - Every number comes with its source and date.
- Raw Asterio exports are never committed; only aggregates are.
- Nothing nominative is stored.

## Brand Commitments

- Maisons & Hôtels Sibuet logo.
- Per-hotel colour themes, with Lodge Park as the pilot.
- Confirmed on 2026-11-27: a discreet Sibuet touch inside a neutral, light application interface. The logo stays in the navigation, the hotel colour is used as an accent, and there are no large photo banners.

## Evidence on Hand

- Real Asterio exports aggregated under `data/signaux/`.
- Market analysis in `data/reference/analyse_marches.json`, dated 26 Nov 2026.
- Hotel photos in `public/lodge/`.
- No testimonials or results from actions taken: in the replay, nothing was sent.

## Product Principles

- Decide in one screen: at most three priorities, each with a market, a reason and Valider / Reporter / Rejeter.
- Every figure shows its source and its date.
- The system proposes and the team validates.
- The market comes before the channel, and the channel before the content.
