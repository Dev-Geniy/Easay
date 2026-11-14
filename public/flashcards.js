// Pure flashcard decks reused in each lesson and before the final exam.
// Kept separate from learner progress: flipping cards does not create a score.
export function deckForLesson(lesson){
 if(!lesson||!Array.isArray(lesson.words))return [];
 return lesson.words.map(([en,ru],i)=>({id:lesson.id+':'+i,en,ru,lessonId:lesson.id}));
}
export function deckForCourse(course){
 if(!course||!Array.isArray(course.lessons))return [];
 return course.lessons.flatMap(deckForLesson);
}
