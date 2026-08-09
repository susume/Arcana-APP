// Shared DOM and rendering helpers. Keep all remote/user-provided text escaped
// before it is placed into an HTML string.
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g,ch=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}

function formatSafeInlineMarkdown(value){
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>');
}

function renderSafeMarkdown(text){
  const lines=String(text ?? '').split(/\r?\n/);
  let html='';
  let inSection=false;
  let inParagraph=false;
  let inList=false;

  const closeParagraph=()=>{
    if(inParagraph){html+='</p>';inParagraph=false;}
  };
  const closeList=()=>{
    if(inList){html+='</ul>';inList=false;}
  };
  const closeSection=()=>{
    closeParagraph();
    closeList();
    if(inSection){html+='</div>';inSection=false;}
  };

  lines.forEach(line=>{
    const trimmed=line.trim();
    if(trimmed.startsWith('## ')){
      closeSection();
      html+='<div class="reading-section"><h3>'+formatSafeInlineMarkdown(trimmed.slice(3))+'</h3>';
      inSection=true;
      return;
    }
    if(trimmed.startsWith('- ')){
      closeParagraph();
      if(!inList){html+='<ul>';inList=true;}
      html+='<li>'+formatSafeInlineMarkdown(trimmed.slice(2))+'</li>';
      return;
    }
    if(!trimmed){
      closeParagraph();
      return;
    }
    closeList();
    if(!inParagraph){html+='<p>';inParagraph=true;}
    html+=formatSafeInlineMarkdown(trimmed)+'<br>';
  });

  closeSection();
  return html.replace(/<p><\/p>/g,'');
}
