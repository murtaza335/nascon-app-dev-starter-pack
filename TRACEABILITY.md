This file tracks requirement coverage. Use REQ-01 in code comments, commit messages, and test names like test_req01_....

| REQ ID | Requirement (from spec) | Day | Code (file:function) | Test (file::name) | Status |
| --- | --- | --- | --- | --- | --- |
| REQ-00 | Service is healthy | - | backend/src/routes/health.js | tests/api/test_health_api.py::test_req00_health_ok | Done |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## Coverage check

```bash
grep -rho "REQ-[0-9]\+" backend tests mobile | sort -u
```
