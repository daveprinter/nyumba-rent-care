import { useId, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { passwordRules } from "@/lib/password";

export function PasswordField({ signup = false }: { signup?: boolean }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const met = passwordRules.filter((rule) => rule.test(value)).length;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input id={id} name="password" type={visible ? "text" : "password"}
          autoComplete={signup ? "new-password" : "current-password"}
          value={value} onChange={(event) => setValue(event.target.value)} required
          minLength={signup ? 6 : undefined} className="pr-12"
          pattern={signup ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9\\s]).{6,}" : undefined}
          aria-describedby={signup ? `${id}-rules` : undefined} />
        <Button type="button" variant="ghost" size="icon"
          className="absolute right-0 top-0 h-full w-11"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {signup && <div id={`${id}-rules`} className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Password requirements</span><span aria-live="polite">{met}/5 met</span>
        </div>
        <Progress value={met * 20} aria-label="Password requirements met" />
        <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          {passwordRules.map((rule) => {
            const passed = rule.test(value);
            const Icon = passed ? Check : Circle;
            return <li key={rule.label} className={`flex items-center gap-1.5 ${passed ? "text-success" : "text-muted-foreground"}`}>
              <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />{rule.label}
            </li>;
          })}
        </ul>
      </div>}
    </div>
  );
}