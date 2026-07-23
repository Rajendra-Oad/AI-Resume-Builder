import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { changeUserRole, changeUserStatus, listAdminActions, listAuditEntries, listUsers } from "../api/adminApi";
import { PromptAdminPanel } from "./PromptAdminPanel";

const date = (value) => value ? new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "";
export const AdminManagementPanel = () => {
  const [tab,setTab]=useState("users");const client=useQueryClient();
  const users=useQuery({queryKey:["admin-users"],queryFn:()=>listUsers(0),enabled:tab==="users"});
  const actions=useQuery({queryKey:["admin-actions"],queryFn:listAdminActions,enabled:tab==="activity"});
  const audit=useQuery({queryKey:["admin-audit"],queryFn:listAuditEntries,enabled:tab==="activity"});
  const update=useMutation({mutationFn:({kind,...payload})=>kind==="role"?changeUserRole(payload):changeUserStatus(payload),onSuccess:()=>client.invalidateQueries({queryKey:["admin-users"]})});
  if(tab==="prompts")return <><nav className="admin-tabs" aria-label="Administration sections"><Button variant="ghost" onClick={()=>setTab("users")}>Users</Button><Button variant="ghost" onClick={()=>setTab("activity")}>Activity</Button><Button onClick={()=>setTab("prompts")}>AI prompts</Button></nav><PromptAdminPanel /></>;
  return <ModulePage eyebrow="ADMINISTRATION" title="Admin management" description="Manage user access and review security-sensitive activity.">
    <nav className="admin-tabs" aria-label="Administration sections"><Button variant={tab==="users"?"primary":"ghost"} onClick={()=>setTab("users")}>Users</Button><Button variant={tab==="activity"?"primary":"ghost"} onClick={()=>setTab("activity")}>Activity</Button><Button variant="ghost" onClick={()=>setTab("prompts")}>AI prompts</Button></nav>
    {update.error&&<p className="form-error" role="alert">{update.error.message}</p>}
    {tab==="users"?<AsyncState isLoading={users.isLoading} error={users.error?.message} onRetry={users.refetch}><Card><div className="table-scroll"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>{(users.data?.items??[]).map((user)=><tr key={user.id}><td><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></td><td><Select aria-label={`Role for ${user.email}`} value={user.role} disabled={update.isPending} onChange={(e)=>update.mutate({kind:"role",id:user.id,value:e.target.value})}><option>USER</option><option>RECRUITER</option><option>ADMIN</option></Select></td><td><Select aria-label={`Status for ${user.email}`} value={user.status} disabled={update.isPending} onChange={(e)=>update.mutate({kind:"status",id:user.id,value:e.target.value})}><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></Select></td><td>{date(user.createdAt)}</td></tr>)}</tbody></table></div>{!users.data?.items?.length&&<div className="empty-state"><h2>No users found</h2></div>}</Card></AsyncState>:
    <div className="admin-activity-grid"><AsyncState isLoading={actions.isLoading} error={actions.error?.message} onRetry={actions.refetch}><Card><h2>Admin actions</h2><ul className="activity-list">{(actions.data?.items??[]).map(item=><li key={item.id}><strong>{item.action}</strong><span>Target user {item.targetUserId??"—"}</span><time>{date(item.createdAt)}</time></li>)}</ul>{!actions.data?.items?.length&&<p className="muted">No administrative actions recorded.</p>}</Card></AsyncState><AsyncState isLoading={audit.isLoading} error={audit.error?.message} onRetry={audit.refetch}><Card><h2>Audit trail</h2><ul className="activity-list">{(audit.data?.items??[]).map(item=><li key={item.id}><strong>{item.action}</strong><span>{item.entityType} #{item.entityId}</span><time>{date(item.createdAt)}</time></li>)}</ul>{!audit.data?.items?.length&&<p className="muted">No audit entries recorded.</p>}</Card></AsyncState></div>}
  </ModulePage>;
};
