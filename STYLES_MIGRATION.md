# Global Styles Migration Guide

## ✅ Benefits of the Global Styles System

### **1. Consistency**
- **Before**: Colors like `'#4CAF50'`, `'#ddd'`, `'#666'` scattered throughout files
- **After**: Centralized `Colors.primary`, `Colors.border`, `Colors.textSecondary`

### **2. Maintainability**
- **Before**: Changing brand color requires editing 50+ files
- **After**: Change `Colors.primary` in one place, updates everywhere

### **3. Reduced Bundle Size**
- **Before**: Duplicate style definitions increase bundle size
- **After**: Shared style objects reduce redundancy

### **4. Developer Experience**
- **Before**: Guessing spacing values, inconsistent naming
- **After**: Predictable `Spacing.base`, `Typography.lg`, semantic naming

### **5. Design System Compliance**
- **Before**: Ad-hoc styling decisions
- **After**: Enforced design tokens and constraints

---

## 🏗️ Architecture Overview

```
styles/
├── index.ts           # Main exports
├── theme.ts           # Design tokens (colors, typography, spacing)
├── GlobalStyles.ts    # Base component styles
└── CareStyles.ts      # Feature-specific styles
```

### **Design Tokens (theme.ts)**
- `Colors` - Semantic color palette
- `Typography` - Font sizes, weights, line heights
- `Spacing` - Consistent spacing scale
- `BorderRadius` - Standard border radius values
- `Shadows` - Reusable shadow presets
- `Layout` - Common layout constants

### **Global Styles (GlobalStyles.ts)**
- Base component styles (buttons, inputs, cards)
- Layout utilities (flexbox, spacing)
- Typography styles
- Common combinations

### **Feature Styles (CareStyles.ts)**
- Specialized styles for care logging
- Plant selection components
- Date/time pickers
- Severity selectors

---

## 🔄 Migration Pattern

### **Before (Component with Local Styles)**
```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### **After (Using Global Styles)**
```tsx
import { GlobalStyles, CommonStyles } from '../styles';

// Use predefined styles
<View style={CommonStyles.formContainer}>
  <TouchableOpacity style={GlobalStyles.button}>
    <Text style={GlobalStyles.buttonText}>Save</Text>
  </TouchableOpacity>
</View>
```

---

## 📋 Step-by-Step Migration

### **1. Import Global Styles**
```tsx
// Replace this:
import { StyleSheet } from 'react-native';

// With this:
import { GlobalStyles, CareStyles, CommonStyles } from '../styles';
```

### **2. Replace Common Patterns**

| **Pattern** | **Before** | **After** |
|-------------|------------|-----------|
| Container | `styles.container` | `GlobalStyles.container` |
| Form | `styles.form` | `CommonStyles.formContainer` |
| Button | `styles.button` | `GlobalStyles.button` |
| Input | `styles.input` | `GlobalStyles.input` |
| Card | `styles.card` | `GlobalStyles.card` |
| Text | `styles.title` | `GlobalStyles.heading2` |

### **3. Use Semantic Naming**
```tsx
// Instead of:
borderColor: '#4CAF50'
backgroundColor: '#ddd'
fontSize: 16

// Use:
borderColor: Colors.primary
backgroundColor: Colors.gray300
fontSize: Typography.base
```

### **4. Remove Local StyleSheet**
```tsx
// Delete this entire section:
const styles = StyleSheet.create({
  // ... all local styles
});
```

---

## 🎯 Quick Reference

### **Common Components**
```tsx
// Containers
<View style={GlobalStyles.container}>
<View style={CommonStyles.formContainer}>
<ScrollView style={GlobalStyles.scrollView}>

// Buttons
<TouchableOpacity style={GlobalStyles.button}>
<TouchableOpacity style={GlobalStyles.buttonSecondary}>
<TouchableOpacity style={GlobalStyles.buttonOutline}>

// Text
<Text style={GlobalStyles.heading1}>
<Text style={GlobalStyles.body}>
<Text style={GlobalStyles.caption}>

// Inputs
<TextInput style={GlobalStyles.input}>
<TextInput style={GlobalStyles.inputTextArea}>

// Layout
<View style={GlobalStyles.flexRow}>
<View style={GlobalStyles.flexRowBetween}>
<View style={GlobalStyles.flexCenter}>
```

### **Event-Specific Components**
```tsx
// Event type selection
<View style={CareStyles.careTypeGrid}>
<TouchableOpacity style={CareStyles.careTypeOption}>

// Date/Time pickers
<TouchableOpacity style={CareStyles.dateTimeButton}>
<View style={CareStyles.pickerContainer}>

// Plant cards
<View style={CareStyles.plantCard}>
<View style={CareStyles.checkbox}>

// Severity selection
<View style={CareStyles.severityContainer}>
<TouchableOpacity style={CareStyles.severityButton}>
```

---

## ⚡ Advanced Patterns

### **Style Composition**
```tsx
// Combine multiple styles
<View style={[GlobalStyles.card, { marginTop: Spacing.lg }]}>

// Conditional styling
<TouchableOpacity 
  style={[
    GlobalStyles.button,
    isDisabled && GlobalStyles.buttonDisabled
  ]}
>
```

### **Custom Extensions**
```tsx
// For component-specific styles, extend global styles
const localStyles = StyleSheet.create({
  specialButton: {
    ...GlobalStyles.button,
    backgroundColor: Colors.warning,
    transform: [{ scale: 1.1 }],
  },
});
```

### **Theme Consistency**
```tsx
// Always use theme values
padding: Spacing.base,           // ✅ Good
fontSize: Typography.lg,         // ✅ Good  
borderRadius: BorderRadius.md,   // ✅ Good

padding: 16,                     // ❌ Avoid
fontSize: 18,                    // ❌ Avoid
borderRadius: 8,                 // ❌ Avoid
```

---

## 🚀 Next Steps

1. **Complete Migration**: Refactor remaining components using this pattern
2. **Add New Styles**: Add any missing patterns to global styles
3. **Extend Theme**: Add new colors, spacing, or typography as needed
4. **Documentation**: Document any component-specific style patterns

This creates a scalable, maintainable styling system that will make your React Native app much easier to work with!
