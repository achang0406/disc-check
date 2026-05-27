import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  block = false,
  className = "",
  type = "button",
  onMouseDown,
  ...props
}) {
  return (
    <button
      type={type}
      className={cx("btn", `btn--${variant}`, block && "btn--block", className)}
      onMouseDown={(event) => {
        suppressMouseFocus(event);
        onMouseDown?.(event);
      }}
      {...props}
    />
  );
}
