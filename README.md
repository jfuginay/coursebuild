# CourseForge AI

CourseForge AI is an innovative platform that transforms YouTube videos into comprehensive, interactive online courses. Think of it as "Cursor for Course Creators" - an AI-powered tool that automatically generates structured learning experiences from video content.

## 🎯 Project Overview

CourseForge AI leverages advanced AI technologies to:
- Automatically generate structured courses from YouTube video content
- Create interactive learning experiences with AI-powered features
- Enable seamless course creation and consumption workflows

## ✨ Core Features

- **AI-driven course structure generation** - Automatically organize video content into logical learning modules
- **Automated quiz creation** - Generate interactive quizzes based on video content
- **Reference verification** - Validate and cross-reference course materials
- **Student progress tracking** - Monitor learner engagement and completion rates
- **Instructor analytics dashboard** - Comprehensive insights for course creators

## 🛠️ Technical Stack

- **Frontend**: Next.js with Pages Router, Tailwind CSS, ShadCN UI
- **Backend**: Node.js with Gemini API integration
- **AI Services**: Google Gemini API, YouTube transcript processing
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **State Management**: React Context API

## 👥 Team Structure

### Team Member 1: AI/Backend Engineer
**Critical Tasks:**
- Gemini API Integration (Due: Day 2)
- YouTube Processing Pipeline (Due: Day 3)
- Quiz Generation System (Due: Day 5)

**Deliverables:**
- Gemini API wrapper for YouTube URLs
- Transcript and question generation
- Support for large video files

### Team Member 2: Frontend Engineer (Creation)
**Critical Tasks:**
- NextJS + ShadCN Setup (Due: Day 1)
- Course Creation Screen (Due: Day 4)
- Quiz Types UI (Due: Day 6)

**Deliverables:**
- Course creation wizard
- Question accept/reject interface
- Multiple quiz type support

### Team Member 3: Frontend Engineer (Consumption)
**Critical Tasks:**
- Public Course Page (Due: Day 4)
- Student Learning Interface (Due: Day 5)
- Video Player Integration (Due: Day 6)

**Deliverables:**
- Shareable course links
- Video player with quiz integration
- Progress tracking UI

### Team Member 4: Product Manager + Infrastructure
**Critical Tasks:**
- Database Implementation (Due: Day 2)
- Deployment Pipeline (Due: Day 6)
- Integration Testing (Due: Day 7)

**Deliverables:**
- Supabase database setup
- API endpoints
- Production deployment
- Demo coordination

## 🚀 Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Add your API keys and configuration
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## 📋 Project Roadmap & Success Metrics

### Sprint Timeline
- **Sprint 1 (Weeks 1-2)**: Foundation and basic video processing
- **Sprint 2 (Weeks 3-4)**: Core feature development
- **Sprint 3 (Weeks 5-6)**: Enhancement and launch preparation

### Success Metrics
**Technical Goals:**
- Processing time < 5 minutes per video
- Quiz generation accuracy > 85%

**Business Goals:**
- 100 course creators in first month
- 500 courses generated
- > 70% student completion rate
- $10k Monthly Recurring Revenue within 3 months

### Current Sprint Tasks
- [x] Dark mode toggle implementation
- [x] Enhanced Gemini integration with segments and timestamps
- [x] Interactive quiz question generation
- [ ] Course creation wizard
- [ ] YouTube processing pipeline
- [ ] Student learning interface
- [ ] Database implementation
- [ ] Deployment pipeline

## 🏗️ Project Structure

- `pages/`: Application pages and routing
- `components/`: Reusable React components
- `contexts/`: Global state management (Theme, Course data)
- `hooks/`: Custom React hooks
- `styles/`: Global styles and Tailwind configuration
- `utils/`: Utility functions and API helpers
- `lib/`: Core libraries and integrations (Gemini API)

## 🚀 Future Enhancements

- Multi-language support
- Advanced video analysis capabilities
- Collaborative course creation tools
- Mobile application
- Integration with popular LMS platforms

## 🔗 Related Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Google Gemini API](https://developers.generativeai.google/docs)
- [Supabase Documentation](https://docs.supabase.com)

## 📧 Team Contact

For questions or collaboration opportunities, please reach out to the team through our GitHub repository or create an issue for technical discussions.
