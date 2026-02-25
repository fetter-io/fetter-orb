## Getting Started

```bash
npm run dev
npm run lint
```

http://localhost:3000

## Notes:

Dev config:

```
% cat .env.local
NEXT_PUBLIC_ORB_MODEL=http://localhost:3001
```

if Debug info:

- Execution of TaskId { id: 2147483648 } transient failed
- Too many open files (os error 24)] {
  code: 'GenericFailure'
  }

```
sudo sysctl fs.inotify.max_user_instances=512
```
