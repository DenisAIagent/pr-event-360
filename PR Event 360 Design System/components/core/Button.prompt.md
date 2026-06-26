**Button** — the primary action control. Use `primary` (digital blue) for the single main action, `secondary` (outline) for adjacent actions, `premium` (navy) for high-intent CTAs like "Demander une démo", and `ghost` for low-emphasis inline actions.

```jsx
<Button variant="primary" leadingIcon={<Plus size={16} />}>Créer un événement</Button>
<Button variant="secondary">Importer une liste presse</Button>
<Button variant="premium" size="lg">Demander une démo</Button>
```

Sizes: `sm` / `md` / `lg`. Pass Lucide icon nodes to `leadingIcon` / `trailingIcon`. `fullWidth` stretches to container. Keep one primary button per view.
