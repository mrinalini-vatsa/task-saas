"use client";

import { useState } from "react";
import { createBoardAction } from "@/app/boards/actions";

export function CreateBoardButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    await createBoardAction(null, formData);
    setTitle("");
    setDescription("");
    setIsPending(false);
    setIsOpen(false);
    window.location.reload();
  };

  if (isOpen) {
    return (
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"white",borderRadius:"12px",padding:"24px",width:"100%",maxWidth:"440px",margin:"16px"}}>
          <h2 style={{fontSize:"20px",fontWeight:600,marginBottom:"16px"}}>Create New Board</h2>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:"12px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:500,marginBottom:"4px"}}>Board Title *</label>
              <input
                type="text"
                placeholder="e.g., Marketing Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"8px 12px",fontSize:"14px",boxSizing:"border-box"}}
              />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:500,marginBottom:"4px"}}>Description</label>
              <textarea
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"8px 12px",fontSize:"14px",boxSizing:"border-box"}}
              />
            </div>
            <div style={{display:"flex",gap:"12px",justifyContent:"flex-end"}}>
              <button type="button" onClick={() => setIsOpen(false)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:"8px",fontSize:"14px",cursor:"pointer",background:"white"}}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} style={{padding:"8px 16px",background:"#111827",color:"white",borderRadius:"8px",fontSize:"14px",cursor:"pointer",border:"none",opacity:isPending?0.5:1}}>
                {isPending ? "Creating..." : "Create Board"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"#111827",color:"white",padding:"8px 16px",borderRadius:"8px",fontSize:"14px",fontWeight:500,border:"none",cursor:"pointer"}}
    >
      + Create Board
    </button>
  );
}