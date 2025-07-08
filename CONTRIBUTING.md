# Contributing to CourseForge AI

Thank you for your interest in contributing to CourseForge AI! This guide will help you get started with contributing to our open source project.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- Git
- Supabase account (for database features)

### Development Setup
1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/coursebuild.it.git
   cd coursebuild.it
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Fill in your environment variables
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### 1. Find an Issue
- Browse [open issues](https://github.com/jfuginay/coursebuild.it/issues)
- Look for `good-first-issue` label for beginners
- Check the `help-wanted` label for priority items
- Or create a new issue using our templates

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes
- Follow our [code standards](#code-standards)
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation if needed

### 4. Test Your Changes
```bash
npm run lint        # Check code style
npm run build       # Ensure builds successfully
npm run test        # Run tests (if available)
```

### 5. Submit a Pull Request
- Push your branch to your fork
- Create a PR with a clear description
- Link any related issues
- Wait for code review

## 🎯 Types of Contributions

### 🐛 Bug Reports
Use our [bug report template](https://github.com/jfuginay/coursebuild.it/issues/new?template=bug_report.yml) to report:
- UI/UX issues
- API errors
- Performance problems
- Browser compatibility issues

### ✨ Feature Requests
Use our [feature request template](https://github.com/jfuginay/coursebuild.it/issues/new?template=feature_request.yml) to suggest:
- New functionality
- User experience improvements
- Integration ideas
- Performance optimizations

### 📝 Documentation
Help improve our documentation by:
- Fixing typos or unclear instructions
- Adding code examples
- Creating tutorials
- Updating API documentation

### 🧪 Testing
- Add unit tests for new features
- Create integration tests
- Test edge cases
- Improve test coverage

## 📏 Code Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions
- Prefer functional programming patterns

### React/Next.js
- Use functional components with hooks
- Follow React best practices
- Use proper TypeScript types
- Implement proper error boundaries
- Optimize for performance

### Styling
- Use Tailwind CSS for styling
- Follow component-based architecture
- Ensure responsive design
- Maintain consistent design system

### API Design
- Use RESTful conventions
- Implement proper error handling
- Add input validation
- Use consistent response formats
- Document API endpoints

## 🔍 Code Review Process

### What We Look For
- ✅ Code quality and readability
- ✅ Test coverage
- ✅ Documentation updates
- ✅ Performance considerations
- ✅ Security best practices

### Review Timeline
- Initial review: Within 2-3 days
- Follow-up reviews: Within 1-2 days
- Approval and merge: Based on complexity

## 📊 Project Structure

```
coursebuild.it/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Next.js pages
│   ├── lib/           # Utility functions
│   ├── styles/        # Global styles
│   └── types/         # TypeScript types
├── supabase/
│   ├── functions/     # Edge functions
│   └── migrations/    # Database migrations
├── public/            # Static assets
├── docs/             # Documentation
└── .github/          # GitHub templates
```

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `task` - Development task or TODO
- `documentation` - Documentation improvements
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed
- `priority:high` - High priority items
- `priority:medium` - Medium priority items
- `priority:low` - Low priority items

## 🚀 Deployment

### Development
- Automatic deployment on push to `main`
- Preview deployments for pull requests
- Staging environment for testing

### Production
- Manual deployment approval required
- Comprehensive testing before release
- Rollback capabilities available

## 💬 Communication

### Discussions
- Use [GitHub Discussions](https://github.com/jfuginay/coursebuild.it/discussions) for:
  - Questions about the project
  - Feature brainstorming
  - General feedback
  - Community announcements

### Issues
- Use GitHub Issues for:
  - Bug reports
  - Feature requests
  - Task tracking
  - Technical discussions

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
- ✅ Be welcoming and inclusive
- ✅ Be respectful of differing viewpoints
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## 🎉 Recognition

### Contributors
- All contributors are recognized in our [README](README.md)
- First-time contributors get a special mention
- Regular contributors may be invited to be maintainers

### Maintainers
Current maintainers:
- [@jfuginay](https://github.com/jfuginay) - Project Lead
- [@rooshmintted](https://github.com/rooshmintted) - Core Developer

## 📚 Resources

### Documentation
- [README](README.md) - Project overview and setup
- [ROADMAP](ROADMAP.md) - Project direction and milestones
- [API Documentation](docs/API.md) - API reference
- [Deployment Guide](supabase/DEPLOYMENT.md) - Deployment instructions

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 🙏 Thank You

Your contributions help make CourseForge AI better for everyone. Whether you're fixing a bug, adding a feature, or improving documentation, your efforts are appreciated!

---

*Last Updated: July 8, 2025*