import javax.sound.midi.MidiFileFormat;

public class Upper_Case {

    public static String Upper_Case(String str){
       String answer="";

       for(int i=0; i<str.length(); i++){
           if (str.charAt(i) >= 'a' && str.charAt(i) <= 'z'){
               answer = str.toUpperCase();
           }
           else{
               answer = str.toUpperCase();
           }
       }

       return answer;
    }

    public static void main(String[] args) {
        System.out.println(Upper_Case("AAA"));
    }
}