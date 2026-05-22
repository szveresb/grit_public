export default {
  ignoreFiles: ['src/App.css'],
  extends: ['stylelint-config-standard'],
  rules: {
    'color-no-hex': true,
    'declaration-property-value-disallowed-list': {
      '/^color|fill|stroke|background(?:-color)?|border(?:-color)?$/': [/rgb\(/i, /rgba\(/i],
    },
  },
};
