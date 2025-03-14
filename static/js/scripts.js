
let globalOrigWords = [];
let globalCorrWords = [];


let activeSuggestionIndex = -1;

console.log("HI");

document.addEventListener("DOMContentLoaded", function () {
  const sentenceInput = document.getElementById("sentenceInput");

  sentenceInput.addEventListener("input", function () {
    const text = sentenceInput.value;
    const trimmed = text.trim();
    if (trimmed.slice(-1) === '.' || trimmed.slice(-1) === '?') {
      getLiveSuggestion(text);
    } else {
      clearRenderedText();
      activeSuggestionIndex = -1;
    }
  });
});

// Listen for keyboard events globally to allow cycling through suggestions
document.addEventListener("keydown", function (e) {
  const container = document.getElementById("renderedText");
  if (!container) return;
  const suggestions = container.querySelectorAll(".highlight");
  if (suggestions.length === 0) return; 

  if (e.ctrlKey && e.key === "]") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
    updateActiveSuggestionHighlight(suggestions);
  } else if (e.ctrlKey && e.key === "[") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
    updateActiveSuggestionHighlight(suggestions);
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex !== -1) {
      e.preventDefault();
      const activeSuggestion = suggestions[activeSuggestionIndex];
      if (activeSuggestion) {
        const index = parseInt(activeSuggestion.getAttribute("data-index"));
        acceptWordSuggestion(index);
        // Reset the active suggestion index and update highlighting.
        activeSuggestionIndex = -1;
        updateActiveSuggestionHighlight(suggestions);
      }
    }
  }
});

// Helper to update the visual style of active suggestion items
function updateActiveSuggestionHighlight(suggestions) {
  suggestions.forEach((el, idx) => {
    if (idx === activeSuggestionIndex) {
      el.classList.add("active-suggestion");
    } else {
      el.classList.remove("active-suggestion");
    }
  });
}

async function getLiveSuggestion(text) {
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    if (!response.ok) {
      console.error("Error: " + response.statusText);
      return;
    }
    const data = await response.json();
    const correctedLastSentence = data.corrected_last_sentence;
    const originalLastSentence = extractLastSentence(text);

    globalOrigWords = originalLastSentence.split(/\s+/).filter(w => w.length > 0);
    globalCorrWords = correctedLastSentence.split(/\s+/).filter(w => w.length > 0);

    activeSuggestionIndex = -1;

    if (globalOrigWords.length === globalCorrWords.length) {
      renderWordDiff(globalOrigWords, globalCorrWords);
    } else {
      renderSentenceDiff(originalLastSentence, correctedLastSentence);
    }
  } catch (error) {
    console.error("Error: " + error.message);
  }
}

function extractLastSentence(text) {
  // Capture sentences ending with . or ? using regex
  console.log("Entered extractLastSentence");
  const sentences = text.match(/[^.?!]+[.?!]+/g);
  if (sentences && sentences.length > 0) {
    return sentences[sentences.length - 1].trim();
  } else {
    return text.trim();
  }
}

function renderWordDiff(origWords, corrWords) {
  const container = document.getElementById("renderedText");
  container.innerHTML = "";
  
  // Render each word as a span with a data-index attribute.
  origWords.forEach((word, i) => {
    const span = document.createElement("span");
    span.innerText = word + " ";
    span.setAttribute("data-index", i);
    span.style.position = "relative"; 
    span.style.cursor = "pointer";    
    if (word !== corrWords[i]) {
      span.className = "highlight";
      span.setAttribute("data-correction", corrWords[i]);
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.innerText = corrWords[i];
      tooltip.style.pointerEvents = "none";
      
      span.appendChild(tooltip);
    }
    container.appendChild(span);
  });
  
  // Attach a single click event listener to the container using event delegation.
  container.addEventListener("click", function (e) {
    let target = e.target;
    while (target && target !== container) {
      if (target.hasAttribute("data-index")) {
        const index = parseInt(target.getAttribute("data-index"));
        console.log("Clicked on word index", index);
        acceptWordSuggestion(index);
        break;
      }
      target = target.parentNode;
    }
  });
}

function renderSentenceDiff(original, corrected) {
  const container = document.getElementById("renderedText");
  container.innerHTML = "";
  const span = document.createElement("span");
  span.className = "highlight";
  span.innerText = original;
  span.setAttribute("data-correction", corrected);
  span.style.position = "relative";
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.innerText = corrected;
  span.appendChild(tooltip);

  // On click, accept full sentence correction
  span.addEventListener("click", function () {
    acceptSentenceSuggestion(corrected);
  });
  container.appendChild(span);
}

function clearRenderedText() {
  document.getElementById("renderedText").innerHTML = "";
}

// Accept correction for a single word: update only that word in the textarea (typing bar)
function acceptWordSuggestion(wordIndex) {
  console.log("ENTERED acceptWordSuggestion");
  const sentenceInput = document.getElementById("sentenceInput");
  let text = sentenceInput.value;
 
  const sentences = text.match(/[^.?!]+[.?!]+/g);
  if (!sentences || sentences.length === 0) return;
  
  // Extract the last sentence where the corrections apply
  let lastSentence = sentences[sentences.length - 1].trim();
  let words = lastSentence.split(/\s+/);
  if (wordIndex < words.length) {
    words[wordIndex] = globalCorrWords[wordIndex];
    const newLastSentence = words.join(" ");
    sentences[sentences.length - 1] = newLastSentence;
    const newText = sentences.join(" ");
    sentenceInput.value = newText;
    globalOrigWords[wordIndex] = globalCorrWords[wordIndex];
    renderWordDiff(globalOrigWords, globalCorrWords);
  }
}

// Accept full sentence correction
function acceptSentenceSuggestion(correctedSentence) {
  const sentenceInput = document.getElementById("sentenceInput");
  let text = sentenceInput.value;
  const sentences = text.match(/[^.?!]+[.?!]+/g);
  if (!sentences || sentences.length === 0) return;
  sentences[sentences.length - 1] = correctedSentence;
  const newText = sentences.join(" ");
  sentenceInput.value = newText;
  // Update global arrays so diff now shows no mismatches
  globalOrigWords = correctedSentence.split(/\s+/).filter(w => w.length > 0);
  globalCorrWords = [...globalOrigWords];
  renderWordDiff(globalOrigWords, globalCorrWords);
}