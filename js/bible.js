const verses = [
  {
    ref: "John 3:16",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    url: "https://www.biblegateway.com/passage/?search=John+3%3A16"
  },
  {
    ref: "Psalm 23:1",
    text: "The Lord is my shepherd; I shall not want.",
    url: "https://www.biblegateway.com/passage/?search=Psalm+23%3A1"
  },
  {
    ref: "Santeria 0:15",
    text: "The Lord is my shepherd; I am not sheep.",
    url: "https://www.youtube.com/watch?v=RMhIC6195KU&t=15s"
  },
  {
    ref: "Philippians 4:13",
    text: "I can do all things through Christ who strengthens me.",
    url: "https://www.biblegateway.com/passage/?search=Philippians+4%3A13"
  },
  {
    ref: "Jeremiah 29:11",
    text: "For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.",
    url: "https://www.biblegateway.com/passage/?search=Jeremiah+29%3A11"
  },
  {
    ref: "Romans 8:28",
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    url: "https://www.biblegateway.com/passage/?search=Romans+8%3A28"
  },
  {
    ref: "Proverbs 3:5-6",
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    url: "https://www.biblegateway.com/passage/?search=Proverbs+3%3A5-6"
  },
  {
    ref: "Isaiah 41:10",
    text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.",
    url: "https://www.biblegateway.com/passage/?search=Isaiah+41%3A10"
  },
  {
    ref: "Matthew 11:28",
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    url: "https://www.biblegateway.com/passage/?search=Matthew+11%3A28"
  },
  {
    ref: "Romans 12:2",
    text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.",
    url: "https://www.biblegateway.com/passage/?search=Romans+12%3A2"
  },
  {
    ref: "Psalm 46:1",
    text: "God is our refuge and strength, an ever-present help in trouble.",
    url: "https://www.biblegateway.com/passage/?search=Psalm+46%3A1"
  },
  {
    ref: "2 Corinthians 5:7",
    text: "For we live by faith, not by sight.",
    url: "https://www.biblegateway.com/passage/?search=2+Corinthians+5%3A7"
  },
  {
    ref: "Hebrews 11:1",
    text: "Now faith is confidence in what we hope for and assurance about what we do not see.",
    url: "https://www.biblegateway.com/passage/?search=Hebrews+11%3A1"
  },
  {
    ref: "Galatians 5:22-23",
    text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.",
    url: "https://www.biblegateway.com/passage/?search=Galatians+5%3A22-23"
  },
  {
    ref: "Ephesians 2:8-9",
    text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.",
    url: "https://www.biblegateway.com/passage/?search=Ephesians+2%3A8-9"
  },
  {
    ref: "John 14:6",
    text: "Jesus answered, ‘I am the way and the truth and the life. No one comes to the Father except through me.’",
    url: "https://www.biblegateway.com/passage/?search=John+14%3A6"
  },
  {
    ref: "1 Corinthians 13:4-7",
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud...",
    url: "https://www.biblegateway.com/passage/?search=1+Corinthians+13%3A4-7"
  },
  {
    ref: "Psalm 119:105",
    text: "Your word is a lamp to my feet and a light to my path.",
    url: "https://www.biblegateway.com/passage/?search=Psalm+119%3A105"
  },
  {
    ref: "James 1:2-3",
    text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.",
    url: "https://www.biblegateway.com/passage/?search=James+1%3A2-3"
  },
  {
    ref: "Matthew 6:33",
    text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
    url: "https://www.biblegateway.com/passage/?search=Matthew+6%3A33"
  },
  {
    ref: "Isaiah 40:31",
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    url: "https://www.biblegateway.com/passage/?search=Isaiah+40%3A31"
  }
];

function getRandomVerse() {
  const randomIndex = Math.floor(Math.random() * verses.length);
  return verses[randomIndex];
}

const verse = getRandomVerse();
console.log(`${verse.ref}: "${verse.text}"`);
console.log(`More info: ${verse.url}`);

document.getElementById("verse").innerText = verse.text;
document.getElementById("reference").innerText = verse.ref;
document.getElementById("link").href = verse.url;