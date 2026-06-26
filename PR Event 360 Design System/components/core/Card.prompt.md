**Card** — the standard surface for grouped content (dashboards, lists, forms). White fill, `--border-default` hairline, `--shadow-sm`, 16px radius, 24px padding by default.

```jsx
<Card>
  <h3>Suivi des accréditations</h3>
  <p>42 validées sur 68 demandes.</p>
</Card>

<Card interactive accent>…clickable, with blue top rule…</Card>
```

Use `interactive` for clickable cards (adds a subtle lift), `accent` for a digital-blue top rule on featured cards. Avoid heavy shadows — the brand favors borders + whitespace.
