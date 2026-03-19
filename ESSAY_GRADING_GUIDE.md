# Essay Grading System with Groq AI

## Overview
The reading quiz system now includes automatic essay grading using Groq AI. Students can write essays and receive instant scores and feedback.

## How It Works

### 1. Essay Questions in Quizzes
- Each reading quiz now has 5 multiple-choice questions (1 point each) + 1 essay question (5 points)
- Total: 10 points per quiz
- Essay question: "Summarize the main idea or theme of the story in your own words."

### 2. Student Experience
- Students see a textarea input for essay questions
- Essays are submitted along with other quiz answers
- Automatic AI grading provides instant feedback

### 3. AI Grading Process
- **Input Validation**: Essays must be at least 10 characters
- **Groq AI Integration**: Uses `llama-3.1-8b-instant` model
- **Scoring**: 0-100 scale based on:
  - Relevance to the question/theme
  - Understanding of the main idea
  - Grammar and clarity
  - Completeness and thoughtfulness
- **Point Conversion**: AI score (0-100) → Quiz points (0-5)
  - Formula: `(AI_score / 100) * question_points`

### 4. Database Storage
- `ai_score`: Raw AI score (0-100)
- `ai_feedback`: AI-generated feedback text
- `points_earned`: Converted score for quiz total

### 5. Error Handling
- Network errors: 50 points + manual review message
- Invalid responses: 50 points + manual review message
- Empty essays: 0 points + "too short" message

## Configuration

### Environment Variables
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
```

### Database Schema
The `reading_quiz_answers` table includes:
```sql
ai_score DECIMAL(6,2) NULL,
ai_feedback TEXT NULL
```

## API Endpoints

### Essay Grading Function
```javascript
async function gradeEssayWithGroq(studentAnswer, questionText = "")
```

### Quiz Submission
`PATCH /api/reading-quiz-attempts/:id/submit`
- Automatically calls essay grading for essay questions
- Updates database with AI scores and feedback

## Frontend Integration

### Essay Input Rendering
```javascript
} else if (q.question_type === "essay") {
  var textarea = document.createElement("textarea");
  textarea.name = "take_essay_" + q.question_id;
  textarea.rows = 6;
  textarea.value = studentAnswer || "";
  textarea.classList.add("form-textarea");
  textarea.style.width = "100%";
  textarea.style.minHeight = "150px";
  div.appendChild(textarea);
}
```

### Answer Submission
```javascript
if (q.question_type === "essay") {
  return { 
    question_id: q.question_id, 
    question_type: "essay", 
    student_answer: (ans || "").trim() 
  };
}
```

## Testing

### Test Essay Examples
**Good Essay (85-100 points):**
"The main theme of this story is about courage in the face of disaster. The villagers showed remarkable resilience when their volcano erupted, working together to save their homes and rebuild their lives. It demonstrates how human spirit can overcome natural disasters through community cooperation and determination."

**Average Essay (60-84 points):**
"The story is about a volcano eruption and how people dealt with it. They had to leave their homes but came back later. The main idea is about surviving disasters."

**Poor Essay (0-59 points):**
"It was about a volcano."

## Monitoring

### Console Logs
The system logs:
- Groq API response status
- Full AI response for debugging
- Essay grading errors

### Error Recovery
- Automatic fallback scoring (50 points) for AI failures
- Manual review notifications for problematic responses
- Input validation prevents empty submissions

## Future Enhancements

1. **Custom Rubrics**: Allow teachers to define grading criteria
2. **Multiple AI Models**: Support different AI providers
3. **Human Override**: Teacher can modify AI scores
4. **Detailed Analytics**: Track essay performance over time
5. **Plagiarism Detection**: Add originality checking

## Troubleshooting

### Common Issues
1. **Groq API Key Missing**: Set `GROQ_API_KEY` in environment
2. **Network Timeouts**: Check internet connection and API status
3. **Invalid JSON Response**: AI response parsing error - automatic fallback
4. **Empty Essays**: Student must write at least 10 characters

### Debug Mode
Enable detailed logging by checking console for:
- "📡 Groq status:" - API response status
- "📩 Full Groq response:" - Complete AI response
- "🧠 Raw AI output:" - Parsed AI content
