import { pool } from "./database";
export async function conversationInsights(projectId:string,days:number) {
  const cutoff=new Date(Date.now()-days*86400000);
  const total=await pool.query(`SELECT COUNT(*) AS n FROM sabito_core.conversation_feedback
    WHERE project_id=$1 AND created_at>=$2`,[projectId,cutoff]);
  const top=await pool.query(`SELECT MIN(m.content) AS question,COUNT(*) AS n
    FROM sabito_core.conversation_feedback f JOIN sabito_core.messages m ON m.id=f.question_message_id
    WHERE f.project_id=$1 AND f.created_at>=$2 GROUP BY f.question_hash ORDER BY n DESC,question LIMIT 20`,[projectId,cutoff]);
  const counts=await pool.query(`SELECT COUNT(*) AS asked,
    SUM(status='satisfied') AS satisfied,SUM(status='unsatisfied') AS unsatisfied,SUM(status='asked') AS pending
    FROM sabito_core.conversation_feedback WHERE project_id=$1 AND asked_at>=$2`,[projectId,cutoff]);
  const row=counts.rows[0],asked=Number(row.asked)||0,satisfied=Number(row.satisfied)||0,
    unsatisfied=Number(row.unsatisfied)||0,answered=satisfied+unsatisfied;
  return {period_days:days,total_questions:Number(total.rows[0].n),top_questions:top.rows.map(r=>({question:r.question,count:Number(r.n)})),
    satisfaction:{asked,answered,satisfied,unsatisfied,pending:Number(row.pending)||0,
      rate:answered?Math.round(satisfied/answered*1000)/10:null,response_rate:asked?Math.round(answered/asked*1000)/10:null}};
}
