/**
 * Text fields match :focus-visible however they are focused, so CSS alone cannot keep
 * their focus ring to the keyboard. While any root is mounted, a control inside a
 * `.dialkit-root` focused by a pointer carries `data-pointer-focus` until it blurs.
 *
 * A mouse click on a folder header also leaves it unfocused, so the next key press
 * neither shows its ring nor toggles the folder again; Enter and Space still toggle a
 * header reached with Tab, and the click they cause has no mouse (detail 0). The same
 * listeners fit a slider's number input to its text.
 */
declare function observePointerFocus(): () => void;

export { observePointerFocus };
