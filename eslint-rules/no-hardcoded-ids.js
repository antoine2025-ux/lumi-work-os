// ESLint custom rule to ban hardcoded IDs and dev bypasses
module.exports = {
  rules: {
    'no-hardcoded-ids': {
      create(context) {
        const hardcodedIds = [
          'dev-user-1',
          'dev-workspace',
          'test-workspace',
          'fixed-workspace-id'
        ]

        const devBypassPatterns = [
          /dev@lumi\.com/,
          /dev-user/,
          /development.*bypass/i,
          /ALLOW_DEV_LOGIN.*true/i
        ]

        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              // Check for hardcoded IDs
              if (hardcodedIds.includes(node.value)) {
                context.report({
                  node,
                  message: `Hardcoded ID "${node.value}" is not allowed. Use environment variables or dynamic values instead.`
                })
              }

              // Check for dev bypass patterns
              if (devBypassPatterns.some(pattern => pattern.test(node.value))) {
                context.report({
                  node,
                  message: `Dev bypass pattern "${node.value}" should be gated behind environment flags.`
                })
              }
            }
          },

          TemplateLiteral(node) {
            const text = node.quasis.map(q => q.value.raw).join('')
            
            // Check for hardcoded IDs in template literals
            if (hardcodedIds.some(id => text.includes(id))) {
              context.report({
                node,
                message: `Template literal contains hardcoded ID. Use environment variables or dynamic values instead.`
              })
            }

            // Check for dev bypass patterns in template literals
            if (devBypassPatterns.some(pattern => pattern.test(text))) {
              context.report({
                node,
                message: `Template literal contains dev bypass pattern. Gate behind environment flags.`
              })
            }
          }
        }
      }
    }
  }
}
