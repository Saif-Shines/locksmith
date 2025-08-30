import figlet from 'figlet';
import gradient from 'gradient-string';

const ASCII_CONFIG = {
  font: 'Small',
  horizontalLayout: 'full',
  verticalLayout: 'full',
};

const title = figlet.textSync('LOCKSMITH', ASCII_CONFIG);

console.log('🎨 GRADIENT OPTIONS FOR LOCKSMITH CLI:\n');

console.log('1. PASTEL (soft rainbow - previous):');
console.log(gradient.pastel(title));
console.log();

console.log('2. RAINBOW (vibrant - current):');
console.log(gradient.rainbow(title));
console.log();

console.log('3. CRISTAL:');
console.log(gradient.cristal(title));
console.log();

console.log('4. TEEN:');
console.log(gradient.teen(title));
console.log();

console.log('5. CUSTOM BLUE-GREEN (Professional):');
console.log(gradient(['#2563EB', '#36BB82'])(title));
console.log();

console.log('6. CUSTOM PURPLE-BLUE (Modern):');
console.log(gradient(['#7C3AED', '#2563EB'])(title));
console.log();

console.log('7. MONOCHROME (Elegant):');
console.log(gradient(['#1F2937', '#6B7280', '#9CA3AF'])(title));
console.log();

console.log('8. NO GRADIENT (Clean):');
console.log(title);
console.log();

console.log(
  '💡 Which gradient do you prefer? Edit src/utils/display.js and change the gradient function!'
);
console.log(
  '\n📝 To change: Replace "gradient.rainbow" with your preferred gradient function.'
);
