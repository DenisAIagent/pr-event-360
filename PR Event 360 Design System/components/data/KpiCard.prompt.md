**KpiCard** — dashboard metric tile with a large figure, fine-line icon, and optional trend. Use for the headline numbers in PR Event 360 dashboards (journalists invited, response rate, accreditations).

```jsx
<KpiCard label="Journalistes invités" value="247" icon={<Users size={18} />} delta="+12%" caption="ce mois" />
<KpiCard label="Taux de réponse" value="68" unit="%" icon={<TrendingUp size={18} />} />
```

Keep ≤4 per row. The figure uses the display font + tabular numbers; `unit` renders in digital blue.
