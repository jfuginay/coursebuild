# Contributing to CourseBuild

Welcome to CourseBuild! 🎉 We're excited to have you join our mission to transform YouTube videos into interactive, AI-powered learning experiences. This guide will help you get started with contributing to our open source project.

## 🌟 Why Contribute?

CourseBuild is revolutionizing online learning by:
- **Democratizing Education**: Making any YouTube video an interactive course
- **AI-Powered Learning**: Using Gemini AI to generate intelligent questions
- **Open Source Impact**: Building tools that benefit the entire learning community

## 🚀 Quick Start (Get Running in 5 Minutes!)

### Prerequisites
- **Node.js 20.x or later** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download here](https://git-scm.com/))
- **Supabase account** (free at [supabase.com](https://supabase.com)) - *Only needed for database features*
- **Google AI Studio account** (free at [aistudio.google.com](https://aistudio.google.com)) - *For Gemini API key*

### One-Command Setup
```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/coursebuild.git
cd coursebuild

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Start development server
npm run dev
```

### 🔧 Environment Configuration
Open `.env.local` and add your API keys:
```bash
# Required for course generation
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Optional: For database features (can work without initially)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **New to APIs?** Check our [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) for detailed instructions!

## 📋 How to Contribute

### 🎯 Perfect First Issues for New Contributors

**Never contributed to open source before?** Start here! 

| **Difficulty** | **Issue Type** | **Examples** |
|---|---|---|
| 🟢 **Beginner** | `good-first-issue` | Fix typos, improve UI text, add simple features |
| 🟡 **Intermediate** | `enhancement` | Add new question types, improve mobile UI |
| 🔴 **Advanced** | `high-priority` | User authentication, database optimization |

### 1. 🔍 Find Your Perfect Issue
- **Browse [open issues](https://github.com/jfuginay/coursebuild/issues)**
- **Filter by labels:**
  - `good-first-issue` - Perfect for beginners
  - `help-wanted` - Community priority items
  - `high-priority` - Critical features/fixes
  - `enhancement` - New features to build
  - `bug` - Problems to solve

### 2. 🌿 Create Your Feature Branch
```bash
# For new features
git checkout -b feature/add-dark-mode

# For bug fixes
git checkout -b fix/scoring-display-bug

# For documentation
git checkout -b docs/update-readme
```

### 3. 🔨 Make Your Changes
- **Follow our [code standards](#code-standards)**
- **Write clear, descriptive commit messages**
- **Test your changes thoroughly**
- **Update documentation if needed**

### 4. ✅ Test Your Changes
```bash
npm run lint        # Check code style
npm run build       # Ensure builds successfully
npm run dev         # Test locally
```

### 5. 🚀 Submit a Pull Request
- **Push your branch to your fork**
- **Create a PR with a clear description**
- **Link any related issues** (e.g., "Fixes #123")
- **Add screenshots** for UI changes
- **Wait for code review** (usually within 2-3 days)

## 🎯 Ways to Contribute

### 🐛 Found a Bug? Report It!
**Use our [bug report template](https://github.com/jfuginay/coursebuild/issues/new?template=bug_report.yml)**

Common bug areas we need help with:
- **UI/UX issues** - Broken layouts, confusing interfaces
- **Quiz system bugs** - Question display, scoring issues
- **Video player problems** - Loading failures, timing issues
- **API errors** - Failed requests, data inconsistencies
- **Mobile compatibility** - Touch issues, responsive design

### ✨ Have a Feature Idea? Suggest It!
**Use our [feature request template](https://github.com/jfuginay/coursebuild/issues/new?template=feature_request.yml)**

Feature areas we're actively developing:
- **User Authentication** - Login, profiles, progress tracking
- **Enhanced Question Types** - Fill-in-blank, drag-and-drop, coding questions
- **Mobile Experience** - Touch controls, offline support
- **Course Management** - Editing, analytics, sharing
- **Learning Paths** - Sequential courses, prerequisites

### 📝 Improve Documentation
**Perfect for first-time contributors!**
- Fix typos or unclear instructions
- Add code examples and tutorials
- Create beginner-friendly guides
- Update API documentation
- Write troubleshooting guides

### 🧪 Add Tests & Quality Assurance
**Help us build reliable software!**
- Add unit tests for new features
- Create integration tests for API endpoints
- Test edge cases and error scenarios
- Improve test coverage
- Manual testing on different devices/browsers

### 🎨 Design & UI Improvements
**Make learning more engaging!**
- Improve user interface design
- Create better user experiences
- Add accessibility features
- Design icons and graphics
- Mobile-first responsive design

## 📏 Code Standards & Tech Stack

### 🛠️ Our Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase Edge Functions
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API for content analysis
- **Deployment**: Vercel for frontend, Supabase for backend

### 💻 Code Guidelines

#### TypeScript/JavaScript
```typescript
// ✅ Good: Use TypeScript with proper types
interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

// ✅ Good: Meaningful variable names
const answeredQuestions = new Set<number>();

// ✅ Good: JSDoc for complex functions
/**
 * Parses question options from string or array format
 * @param options - Raw options data
 * @returns Parsed options array
 */
function parseOptions(options: string[] | string): string[] {
  // Implementation
}
```

#### React/Next.js Best Practices
```tsx
// ✅ Good: Functional components with proper types
interface CourseViewerProps {
  course: Course;
  questions: Question[];
}

export default function CourseViewer({ course, questions }: CourseViewerProps) {
  // Use hooks for state management
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  
  // Handle errors gracefully
  if (!course) {
    return <div>Course not found</div>;
  }
  
  return (
    // JSX implementation
  );
}
```

#### Styling with Tailwind CSS
```tsx
// ✅ Good: Responsive, accessible design
<button className="
  bg-blue-600 hover:bg-blue-700 
  text-white font-medium py-2 px-4 
  rounded-lg transition-colors
  focus:outline-none focus:ring-2 focus:ring-blue-500
  md:py-3 md:px-6
">
  Submit Answer
</button>
```

#### API Design
```typescript
// ✅ Good: Consistent error handling
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate input
    if (!req.body.courseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Course ID is required' 
      });
    }
    
    // Process request
    const result = await processRequest(req.body);
    
    // Return consistent response format
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

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

## 🏷️ Issue Labels & Current Focus Areas

### 📊 Current Project Status
- **🔥 High Priority**: User authentication, mobile optimization, data consistency
- **📈 Active Development**: Enhanced question types, course management
- **🐛 Known Issues**: True/False question display, API rate limiting
- **📱 Mobile Support**: Touch controls, responsive design improvements

### 🏷️ Issue Labels Guide
| Label | Description | Good For |
|-------|-------------|----------|
| `good-first-issue` | Perfect for beginners | New contributors |
| `help-wanted` | Community priority | Anyone wanting to help |
| `high-priority` | Critical features/fixes | Experienced developers |
| `enhancement` | New features | Feature developers |
| `bug` | Something broken | Bug hunters |
| `documentation` | Docs improvements | Writers, beginners |
| `quiz-system` | Quiz/question features | Frontend developers |
| `video-player` | Video functionality | Media developers |

### 🎯 Recommended Issues by Experience Level

#### 🟢 Beginner (New to Open Source)
- Documentation fixes and improvements
- UI text updates and typo fixes
- Simple styling improvements
- Basic component enhancements

#### 🟡 Intermediate (Some Experience)
- Bug fixes in existing features
- New UI components
- API endpoint improvements
- Mobile responsiveness fixes

#### 🔴 Advanced (Experienced Developers)
- User authentication system
- Database schema changes
- Performance optimizations
- Complex AI integration features

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
- Use [GitHub Discussions](https://github.com/jfuginay/coursebuild/discussions) for:
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

### Maintainers & Community
**Project Owners:**
- [@jfuginay](https://github.com/jfuginay)
- [@alanli-ml](https://github.com/alanli-ml)
- [@yashchitneni](https://github.com/yashchitneni)
- [@rooshmintted](https://github.com/rooshmintted)

**Want to become a maintainer?** Active contributors who demonstrate:
- Consistent, quality contributions
- Help with code reviews
- Support for other contributors
- Alignment with project values

May be invited to join the core team!

## 📚 Resources

### 📖 Project Documentation
- **[README](README.md)** - Project overview and setup
- **[ROADMAP](ROADMAP.md)** - Project direction and milestones  
- **[TODO](TODO.md)** - Current tasks and project status
- **[API Documentation](docs/API.md)** - API reference *(coming soon)*
- **[Deployment Guide](supabase/DEPLOYMENT.md)** - Deployment instructions *(coming soon)*

### 🛠️ Tech Stack Resources
- **[Next.js Documentation](https://nextjs.org/docs)** - Framework documentation
- **[React Documentation](https://reactjs.org/docs)** - UI library documentation
- **[Supabase Documentation](https://supabase.com/docs)** - Backend & database
- **[Tailwind CSS Documentation](https://tailwindcss.com/docs)** - Styling framework
- **[Google AI Studio](https://aistudio.google.com)** - Gemini API documentation

### 💬 Community & Support
- **[GitHub Discussions](https://github.com/jfuginay/coursebuild/discussions)** - Community forum
- **[GitHub Issues](https://github.com/jfuginay/coursebuild/issues)** - Bug reports & feature requests
- **[Live Demo](https://coursebuild.org)** - See the project in action

---

## 🙏 Thank You for Contributing!

**Every contribution matters!** Whether you're:
- 🐛 **Fixing a bug** - Making the app more reliable
- ✨ **Adding a feature** - Enhancing the user experience  
- 📝 **Improving docs** - Helping others contribute
- 🧪 **Adding tests** - Building confidence in our code
- 🎨 **Designing UI** - Making learning more engaging

You're helping democratize education and making learning more accessible for everyone. We're grateful for your time and effort!

### 🚀 Ready to Start?
1. **Star the repository** ⭐
2. **Fork the project** 🍴
3. **Find an issue** that interests you 🔍
4. **Make your contribution** 💻
5. **Submit a pull request** 🚀

**Welcome to the CourseBuild community!** 🎉

---

*Last Updated: July 8, 2025*