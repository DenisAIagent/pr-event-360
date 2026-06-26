**Input** — labelled text field. Hairline `--border-strong` border, digital-blue focus ring, optional leading icon, hint and error text.

```jsx
<Input label="Email du journaliste" placeholder="prenom@media.fr" leadingIcon={<Mail size={16} />} />
<Input label="Nom" error="Ce champ est requis" />
```

Pass standard input attributes (`type`, `value`, `onChange`, …) through. Use `hint` for help text, `error` for validation.
