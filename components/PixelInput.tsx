interface PixelInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function PixelInput({ value, onChangeText, placeholder }: PixelInputProps) {
  return (
    <input 
      className="border-2 border-pikmin-earth p-2 font-pixel text-xs bg-white"
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
    />
  );
}