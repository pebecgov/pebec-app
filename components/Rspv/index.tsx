// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
export default function RSVPPage({
  eventId
}: {
  eventId: Id<"events">;
}) {
  const [answers, setAnswers] = useState<{
    questionId: Id<"event_questions">;
    answer: string;
  }[]>([]);
  const getEventQuestions = useQuery(api.events.getEventQuestions, {
    eventId
  });
  useEffect(() => {
    if (getEventQuestions) {
      setAnswers(getEventQuestions.map(question => ({
        questionId: question._id,
        answer: ""
      })));
    }
  }, [getEventQuestions]);
  const handleChange = (questionId: Id<"event_questions">, value: string) => {
    setAnswers(prevAnswers => {
      const existingAnswer = prevAnswers.find(answer => answer.questionId === questionId);
      if (existingAnswer) {
        existingAnswer.answer = value;
        return [...prevAnswers];
      }
      return [...prevAnswers, {
        questionId,
        answer: value
      }];
    });
  };
  const rsvpEventMutation = useMutation(api.events.rsvpEvent);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await rsvpEventMutation({
      eventId,
      answers
    });
  };
  if (!getEventQuestions) return <p>Loading questions...</p>;
  return <form onSubmit={handleSubmit}>
      <h2>RSVP for the event</h2>

      {getEventQuestions.map(question => <div key={question._id}>
          <label>{question.questionText}</label>
          {question.questionType === "text" && <input type="text" value={answers.find(answer => answer.questionId === question._id)?.answer || ""} onChange={e => handleChange(question._id, e.target.value)} />}
          {question.questionType === "number" && <input type="number" value={answers.find(answer => answer.questionId === question._id)?.answer || ""} onChange={e => handleChange(question._id, e.target.value)} />}
          {question.questionType === "email" && <input type="email" value={answers.find(answer => answer.questionId === question._id)?.answer || ""} onChange={e => handleChange(question._id, e.target.value)} />}
          {question.questionType === "scale" && <input type="range" min="1" max="5" value={answers.find(answer => answer.questionId === question._id)?.answer || "3"} onChange={e => handleChange(question._id, e.target.value)} />}
        </div>)}

      <Button type="submit">Submit RSVP</Button>
    </form>;
}