# How to contribute

## Testing

Please write unit tests for all new code you create. You can see how we do tests in `/test/`.

## Submitting changes

Please send a Merge Request for your changes. Please follow our coding conventions (below) and make sure all of your commits are atomic (one functional unit per commit).

Always write a clear descriptive log message for each of your commits. For example:

```
    $ git commit -m "feat: a brief summary of the commit
    >
    > A paragraph describing what changed and its impact."
```

Example of commit messages we will not approve:

```
    $ git commit -m "new version"
```

```
    $ git commit -m "41"
```

```
    $ git commit -m "bump"
```

Feel free to use GitMojis (https://gitmoji.carloscuesta.me/).

Name your single issue branches aimed for MR as `<issue-number>-issue-description` so the issue will get linked to that branch. Same as mentioning issue number (with `#`) in commit message (example `$ git commit -m "feat(#34): a brief summary of the commit`). We lint our commit messages with `commitlint`. Click [here](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional#rules) for the rules.

## Code style guide and design decisions

-   The [core](https://gitlab.com/operator-ict/golemio/code/modules/core) module is a base part of our application, similar to `libs` in other projects, server for the core data platform functionality, should be usable by another project (different city, different datasets, different use-cases) and SHOULD NOT depend on anything project-specific (anything outside `core`).
-   [resources](https://gitlab.com/operator-ict/golemio/code/modules) are our project-specific resources (datasets) that we use.
-   We use Async/Await for asynchronous stuff (try to avoid callbacks or Promises).
-   We use OOP, try to design your changes with this in mind - use Classes, Interfaces, inheritence so that it makes sense.
-   We use TypeScript for a reason - try to avoid using :any or not defining types at all.
-   Study our class hierarchy and make your additions fit it.
-   Name variables and properties by their purpose.
-   Name functions and methods by their purpose, not their implementation.
-   We use ES6 and its features, array destructing, spread, rest,...

## Coding conventions

Start reading our code and you'll get the hang of it. We optimize for readability:

-   We use ESLint with out custom shared settings, see [@golemio/eslint-config](https://www.npmjs.com/package/@golemio/eslint-config).
-   We use TypeDoc for code documentation. Document all your classes with JavaDoc-styled comments.
-   We always put spaces after list items and method parameters (`[1, 2, 3]`, not `[1,2,3]`), around operators (`x += 1`, not `x+=1`), and in curly brackets (`import { log } from "../../core/Logger";` not `import {log} from "../../core/Logger";`).
-   This is open source software. Consider the people who will read your code, and make it look nice for them.
