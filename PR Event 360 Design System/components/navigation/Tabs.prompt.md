**Tabs** — horizontal section navigation with an active underline in digital blue and optional count pills.

```jsx
const [tab, setTab] = React.useState('contacts');
<Tabs
  value={tab}
  onChange={setTab}
  items={[
    { value: 'contacts', label: 'Contacts', icon: <Users size={15} />, count: 247 },
    { value: 'invitations', label: 'Invitations', count: 68 },
    { value: 'accreditations', label: 'Accréditations' },
  ]}
/>
```

Controlled — track the active value in state. Keep labels short.
