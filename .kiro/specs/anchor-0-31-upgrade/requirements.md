# Anchor 0.31.0 Upgrade Requirements

## 1. Overview

**Feature Name**: anchor-0-31-upgrade  
**Status**: Planning  
**Priority**: High  
**Created**: 2026-02-08

### 1.1 Background

The Anchor.toml file was just updated from version 0.30.1 to 0.31.0. This is a significant upgrade that requires careful migration to ensure compatibility across the entire ARS codebase. Anchor 0.31.0 is described as "the last major release before v1" and includes breaking changes, performance improvements, and new features.

### 1.2 Problem Statement

The current codebase has inconsistent version specifications:
- **Anchor.toml**: Updated to 0.31.0 ✅
- **Cargo.toml workspace dependencies**: Still at 0.30.1 ❌
- **Solana toolchain**: Currently using 1.18.x, but 0.31.0 recommends Solana 2.1.0 ❌
- **TypeScript packages**: Need verification for @coral-xyz/anchor version ❌

This version mismatch can lead to:
- Build failures due to incompatible dependencies
- Runtime errors from API changes
- Missing performance improvements and bug fixes
- Stack memory issues not being caught during compilation

### 1.3 Goals

1. **Complete version alignment** across all Anchor dependencies
2. **Solana toolchain upgrade** to recommended version 2.1.0 (Agave)
3. **Leverage new features** for improved security and performance
4. **Maintain backward compatibility** with existing deployed programs
5. **Update documentation** to reflect version requirements

## 2. User Stories

### 2.1 As a Developer

**Story 2.1.1**: Consistent Build Environment  
As a developer, I want all Anchor dependencies to be at version 0.31.0 so that I can build the project without version conflicts.

**Acceptance Criteria**:
- [ ] Cargo.toml workspace dependencies updated to 0.31.0
- [ ] All program Cargo.toml files use workspace dependencies
- [ ] `anchor build` completes successfully
- [ ] No version conflict warnings in build output

**Story 2.1.2**: Reliable Stack Warnings  
As a developer, I want reliable stack memory warnings during builds so that I can catch stack overflow issues before deployment.

**Acceptance Criteria**:
- [ ] Solana toolchain upgraded to 2.1.0+
- [ ] Stack warnings appear consistently for functions exceeding 4096 bytes
- [ ] Build logs clearly indicate stack usage issues
- [ ] Documentation updated with stack memory best practices

**Story 2.1.3**: Improved Performance  
As a developer, I want to leverage the init constraint stack improvements so that my programs use less stack memory.

**Acceptance Criteria**:
- [ ] Existing `init` constraints continue to work
- [ ] Stack usage reduced for instructions with multiple `init` constraints
- [ ] No undefined behavior in tests with direct account data mapping

### 2.2 As a Security Auditor

**Story 2.2.1**: Version Verification  
As a security auditor, I want to verify that all dependencies are at the correct version so that I can assess the security posture accurately.

**Acceptance Criteria**:
- [ ] Version matrix documented in tech.md
- [ ] All dependencies explicitly specified (no wildcards)
- [ ] Dependency audit passes with no critical vulnerabilities

### 2.3 As a DevOps Engineer

**Story 2.3.1**: Deployment Compatibility  
As a DevOps engineer, I want to ensure that the upgraded programs are compatible with existing deployments so that I can upgrade without downtime.

**Acceptance Criteria**:
- [ ] Program IDs remain unchanged
- [ ] Account structures maintain backward compatibility
- [ ] Existing on-chain accounts can be read by upgraded programs
- [ ] Rollback plan documented

## 3. Functional Requirements

### 3.1 Dependency Updates

**REQ-3.1.1**: Update Cargo workspace dependencies  
The root Cargo.toml must specify anchor-lang and anchor-spl at version 0.31.0.

**REQ-3.1.2**: Verify program dependencies  
All three programs (ars-core, ars-reserve, ars-token) must use workspace dependencies for Anchor crates.

**REQ-3.1.3**: Update TypeScript packages  
Backend and frontend must use @coral-xyz/anchor version 0.31.0.

**REQ-3.1.4**: Update Solana dependencies  
Dev dependencies (solana-program-test, solana-sdk) should be updated to match Solana 2.1.0 compatibility.

### 3.2 Toolchain Configuration

**REQ-3.2.1**: Solana version specification  
Anchor.toml must specify `toolchain.solana_version = "2.1.0"` for automatic Agave transition.

**REQ-3.2.2**: AVM installation  
Development environment must use AVM (Anchor Version Manager) for version management.

**REQ-3.2.3**: Binary installation  
Anchor CLI should be installed from binary (not source) for faster setup.

### 3.3 Code Compatibility

**REQ-3.3.1**: Discriminator trait usage  
Replace any usage of `discriminator()` method with `DISCRIMINATOR` constant.

**REQ-3.3.2**: Stack memory optimization  
Review all instructions with multiple `init` constraints for stack usage.

**REQ-3.3.3**: Custom discriminators consideration  
Evaluate whether custom discriminators (< 8 bytes) would benefit transaction size optimization.

### 3.4 Testing Requirements

**REQ-3.4.1**: Property-based tests  
All existing property-based tests must pass with the new version.

**REQ-3.4.2**: Integration tests  
Backend integration tests must pass with updated TypeScript client.

**REQ-3.4.3**: Stack memory tests  
Add tests to verify stack usage warnings are triggered correctly.

### 3.5 Documentation Updates

**REQ-3.5.1**: Tech stack documentation  
Update tech.md with Anchor 0.31.0 and Solana 2.1.0 versions.

**REQ-3.5.2**: Build instructions  
Update build scripts and documentation for Agave toolchain.

**REQ-3.5.3**: Migration guide  
Create internal migration guide for team members.

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-4.1.1**: Build time  
Build time should not increase by more than 10% compared to 0.30.1.

**NFR-4.1.2**: Stack usage  
Stack usage for instructions with `init` constraints should decrease.

### 4.2 Compatibility

**NFR-4.2.1**: Backward compatibility  
Upgraded programs must be able to read existing on-chain accounts.

**NFR-4.2.2**: IDL compatibility  
Generated IDLs must be compatible with existing frontend/SDK code.

### 4.3 Security

**NFR-4.3.1**: Dependency audit  
All dependencies must pass security audit with no critical vulnerabilities.

**NFR-4.3.2**: Stack overflow protection  
Stack warnings must be reliable to prevent undefined behavior.

## 5. Technical Constraints

### 5.1 Version Requirements

- Anchor CLI: 0.31.0
- anchor-lang: 0.31.0
- anchor-spl: 0.31.0
- Solana: 2.1.0 (Agave)
- @coral-xyz/anchor: 0.31.0
- Rust: 1.75+ (unchanged)
- Node.js: 18+ (unchanged)

### 5.2 Breaking Changes to Address

1. **Discriminator trait**: `discriminator()` method removed, use `DISCRIMINATOR` constant
2. **Agave transition**: Some Solana binaries renamed (solana-install → agave-install)
3. **IDL generation**: Automatic conversion of legacy IDLs (should not affect us)
4. **Stack warnings**: Now reliable with Solana v2 (requires toolchain update)

### 5.3 Platform Support

- Windows: PowerShell scripts need Agave compatibility
- Linux: Bash scripts need Agave compatibility
- macOS: Both Intel and Apple Silicon support

## 6. Out of Scope

The following are explicitly out of scope for this upgrade:

1. **Custom discriminators**: Not implementing custom discriminators initially (can be future enhancement)
2. **LazyAccount**: Not adopting LazyAccount type (experimental feature)
3. **Package manager change**: Keeping yarn as default (not switching to npm/pnpm)
4. **Mollusk testing**: Not adopting mollusk test framework yet
5. **Program refactoring**: Not restructuring existing program logic

## 7. Dependencies

### 7.1 External Dependencies

- Anchor 0.31.0 release availability ✅
- Solana 2.1.0 (Agave) release availability ✅
- @coral-xyz/anchor npm package at 0.31.0 ✅

### 7.2 Internal Dependencies

- Security audit findings (CRITICAL and HIGH issues) should be fixed first
- Existing tests must be passing before upgrade
- Development environment setup documentation

## 8. Risks and Mitigations

### 8.1 Risk: Build Failures

**Probability**: Medium  
**Impact**: High  
**Mitigation**: 
- Test build on clean environment first
- Document all build errors and solutions
- Maintain 0.30.1 branch as fallback

### 8.2 Risk: Stack Overflow Issues Revealed

**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Reliable stack warnings will catch issues early
- Review all instructions with multiple accounts
- Optimize stack usage before deployment

### 8.3 Risk: TypeScript Client Incompatibility

**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Test all API endpoints after upgrade
- Run full integration test suite
- Update TypeScript types if needed

### 8.4 Risk: Deployment Compatibility

**Probability**: Low  
**Impact**: Critical  
**Mitigation**:
- Test on devnet first
- Verify account deserialization works
- Document rollback procedure

## 9. Success Metrics

### 9.1 Technical Metrics

- [ ] All builds complete successfully
- [ ] All tests pass (unit, integration, property-based)
- [ ] Stack warnings appear for known problematic code
- [ ] Build time within 10% of previous version
- [ ] Zero version conflict warnings

### 9.2 Quality Metrics

- [ ] No new security vulnerabilities introduced
- [ ] Code coverage maintained or improved
- [ ] Documentation updated and reviewed
- [ ] Team members successfully build on their machines

## 10. Timeline Estimate

**Total Estimated Time**: 1-2 days

### Phase 1: Dependency Updates (4 hours)
- Update Cargo.toml files
- Update package.json files
- Update Anchor.toml with Solana version
- Install new toolchain

### Phase 2: Code Updates (2 hours)
- Fix discriminator trait usage
- Review stack usage
- Update any deprecated APIs

### Phase 3: Testing (4 hours)
- Run all test suites
- Fix any test failures
- Verify stack warnings

### Phase 4: Documentation (2 hours)
- Update tech.md
- Update build scripts
- Create migration notes

## 11. Acceptance Criteria

The upgrade is considered complete when:

1. ✅ All Anchor dependencies at version 0.31.0
2. ✅ Solana toolchain at version 2.1.0
3. ✅ All programs build successfully
4. ✅ All tests pass (unit, integration, property-based)
5. ✅ Stack warnings appear reliably
6. ✅ Documentation updated
7. ✅ Build scripts updated for Agave
8. ✅ Team members can build successfully
9. ✅ Devnet deployment successful
10. ✅ No regression in functionality

## 12. References

- [Anchor 0.31.0 Release Notes](https://www.anchor-lang.com/docs/updates/release-notes/0-31-0)
- [Anchor Changelog](https://www.anchor-lang.com/docs/updates/changelog)
- [Solana 2.1.0 (Agave) Documentation](https://docs.solanalabs.com/)
- [ARS Security Audit Report](../../documentation/security/ARS_SECURITY_AUDIT_2026.md)
- [ARS Tech Stack](../../.kiro/steering/tech.md)
