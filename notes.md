## 빌드 후 view, public 폴더는 build 폴더에 수동으로 넣어줘야 함

주어진 코드 조각에서 보이는 것은 JavaScript의 두 가지 모듈 시스템인 CommonJS와 ES6 모듈 시스템의 차이점을 나타내고 있습니다. 이 두 모듈 시스템은 JavaScript 코드를 구성하고 다른 파일 간에 코드를 공유하는 방법을 다르게 다루고 있습니다.

1. CommonJS 모듈 시스템:
   - `require()` 함수를 사용하여 모듈을 가져옵니다.
   - `module.exports` 객체를 사용하여 모듈에서 내보낼 내용을 정의합니다.

예제:

```javascript
// 모듈 가져오기
const someModule = require("./someModule");

// 모듈에서 내보내기
module.exports = someFunction;
```

2. ES6 모듈 시스템:
   - `import` 문을 사용하여 모듈을 가져옵니다.
   - `export` 문을 사용하여 모듈에서 내보낼 내용을 정의합니다.

예제:

```javascript
// 모듈 가져오기
import someModule from "./someModule";

// 모듈에서 내보내기
export default someFunction;
```

이 두 모듈 시스템은 주로 다른 환경에서 사용됩니다. CommonJS는 Node.js 환경에서 주로 사용되고, ES6 모듈은 웹 브라우저와 현대적인 JavaScript 개발에서 사용됩니다. 또한 ES6 모듈은 정적 분석(static analysis)과 트리 셰이킹(tree shaking) 같은 최적화 기능을 제공하므로 더 효율적이고 모던한 방법으로 모듈을 다룰 수 있습니다.

https://api.gbif.org/v1/species/search?threat=CRITICALLY_ENDANGERED
